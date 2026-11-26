import { NextRequest, NextResponse } from "next/server";
import * as ftp from "basic-ftp";
import { Readable } from "stream";
import path from "node:path";
import { getServerAuth } from "@/lib/supabase/server";
import { isInventoryRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

// Helper de connexion FTP centralisé
async function connectFtp(): Promise<ftp.Client> {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  await client.access({
    host: process.env.FTP_HOST,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    secure: false, // Mets true si ton serveur supporte FTPS
  });
  const remoteDir = process.env.FTP_REMOTE_DIR || "/";
  await client.cd(remoteDir);
  return client;
}

// 1. POST : UPLOAD D'IMAGE
export async function POST(req: NextRequest) {
  const auth = await getServerAuth();
  if (!auth.user || !auth.profile || !isInventoryRole(auth.profile.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const client = await connectFtp();

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: "Maximum 10 fichiers autorisés à la fois." }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);

      // uploadFrom utilise le nom d'origine et écrase si le fichier existe déjà
      await client.uploadFrom(stream, file.name);

      uploadedUrls.push(`https://${process.env.NEXT_PUBLIC_IMAGES_DIR || "images.bybkm.fr"}/${file.name}`);
    }

    return NextResponse.json({
      success: true,
      message: `${files.length} image(s) uploadée(s) avec succès.`,
      urls: uploadedUrls,
    });
  } catch (error: any) {
    console.error("[FTP_UPLOAD_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'upload sur le serveur FTP." },
      { status: 500 }
    );
  } finally {
    client.close();
  }
}

// 2. GET : LISTER LES IMAGES EXISTANTES
export async function GET() {
  const auth = await getServerAuth();
  if (!auth.user || !auth.profile || !isInventoryRole(auth.profile.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const client = new ftp.Client();

  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false,
    });

    await client.cd(process.env.FTP_REMOTE_DIR || "/");

    const fileList = await client.list();
    const images = fileList
      .filter((file) => file.isFile && file.name.match(/\.(jpg|jpeg|png|webp)$/i))
      .map((file) => ({
        name: file.name,
        url: `https://${process.env.NEXT_PUBLIC_IMAGES_DIR || "images.bybkm.fr"}/${file.name}`,
        size: (file.size / 1024).toFixed(1) + " KB",
        date: file.modifiedAt,
      }))
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    return NextResponse.json({ images });
  } catch (error) {
    console.error("[FTP_LIST_ERROR]", error);
    return NextResponse.json({ error: "Impossible de lister les images FTP." }, { status: 500 });
  } finally {
    client.close();
  }
}

// 3. DELETE : SUPPRIMER UNE IMAGE DU FTP
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.user || !auth.profile || !isInventoryRole(auth.profile.role)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const imageName = searchParams.get("name");

    if (!imageName) {
      return NextResponse.json({ error: "Nom de fichier manquant." }, { status: 400 });
    }

    // Sécurisation stricte du nom de fichier pour éviter les injections de chemin
    const safeName = path.basename(imageName);

    const client = await connectFtp();

    try {
      await client.remove(safeName);
    } catch (ftpErr: any) {
      console.error("[FTP_REMOVE_ERROR]", ftpErr);
      return NextResponse.json({ error: "Fichier introuvable ou impossible à supprimer sur le FTP." }, { status: 404 });
    } finally {
      client.close();
    }

    return NextResponse.json({
      success: true,
      message: `Image ${safeName} supprimée avec succès.`,
    });
  } catch (error: any) {
    console.error("[FTP_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression sur le serveur FTP." },
      { status: 500 }
    );
  }
}