import { NextRequest, NextResponse } from "next/server";
import * as ftp from "basic-ftp";
import { Readable } from "stream";

// 1. POST : UPLOAD D'IMAGE
export async function POST(req: NextRequest) {
  const client = new ftp.Client();
  client.ftp.verbose = false; // Passe à true si tu veux voir les logs FTP dans ton terminal

  try {
    const formData = await req.formData();
    
    // ✅ NOUVEAU : On récupère TOUS les fichiers envoyés par le Drag & Drop
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }

    // ✅ SÉCURITÉ : Limite à 10 fichiers max
    if (files.length > 10) {
      return NextResponse.json({ error: "Maximum 10 fichiers autorisés à la fois." }, { status: 400 });
    }

    // 1. Connexion FTP
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false // Mets true si ton serveur supporte FTPS
    });

    // 2. Navigation vers le bon dossier
    const remoteDir = process.env.FTP_REMOTE_DIR || "/";
    try {
      await client.cd(remoteDir);
    } catch (dirError: any) {
      console.error(`[FTP_CD_ERROR] Impossible d'accéder au dossier ${remoteDir}`);
      throw new Error(`Le dossier ${remoteDir} n'existe pas sur le serveur. Veuillez le créer.`);
    }

    const uploadedUrls: string[] =[];

    // 3. Boucle d'envoi pour chaque fichier
    for (const file of files) {
      // Conversion du fichier en Stream pour le FTP
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);

      // ✅ PRO : "uploadFrom" utilise le nom d'origine (file.name) 
      // et écrase automatiquement le fichier distant s'il existe déjà !
      await client.uploadFrom(stream, file.name);
      
      uploadedUrls.push(`https://images.bybkm.fr/${file.name}`);
    }

    // 4. Succès
    return NextResponse.json({ 
      success: true, 
      message: `${files.length} image(s) uploadée(s) avec succès.`,
      urls: uploadedUrls
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
  const client = new ftp.Client();
  
  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false
    });

    await client.cd(process.env.FTP_REMOTE_DIR || "/");
    
    // Liste uniquement les fichiers JPG, JPEG, PNG
    const fileList = await client.list();
    const images = fileList
      .filter(file => file.isFile && file.name.match(/\.(jpg|jpeg|png)$/i))
      .map(file => ({
        name: file.name,
        url: `https://images.bybkm.fr/${file.name}`,
        size: (file.size / 1024).toFixed(1) + " KB",
        date: file.modifiedAt
      }))
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()); // Plus récents en premier

    return NextResponse.json({ images });

  } catch (error) {
    console.error("[FTP_LIST_ERROR]", error);
    return NextResponse.json({ error: "Impossible de lister les images FTP." }, { status: 500 });
  } finally {
    client.close();
  }
}