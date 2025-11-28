import { FileAttachment } from "@/app/types/documents";
import { supabase } from "@/lib/supabase";

interface FilePreviewProps {
    file: FileAttachment;
}

// Helper pour les couleurs par extension
const getExtensionStyle = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || "";
    switch (ext) {
        case 'pdf': return 'bg-red-100 text-red-700 border-red-200';
        case 'xls': case 'xlsx': case 'csv': return 'bg-green-100 text-green-700 border-green-200';
        case 'doc': case 'docx': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'zip': case 'rar': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

export const FilePreview = ({ file }: FilePreviewProps) => {
    // On génère l'URL publique
    const { data } = supabase.storage.from('files').getPublicUrl(file.file_path);
    const url = data.publicUrl;
    
    const isImage = file.file_type.startsWith('image/');
    const ext = file.file_name.split('.').pop()?.toUpperCase() || "?";
    const styleClass = getExtensionStyle(file.file_name);

    if (isImage) {
        return (
            <div 
                className="relative h-8 w-8 min-w-[2rem] rounded overflow-hidden border border-gray-200 group cursor-zoom-in"
                onClick={(e) => {
                    e.stopPropagation(); // Empêche d'ouvrir le manager si on veut juste voir l'image
                    window.open(url, '_blank');
                }}
            >
                <img 
                    src={url} 
                    alt={file.file_name} 
                    className="h-full w-full object-cover" 
                />
                {/* Tooltip au survol */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" title={file.file_name} />
            </div>
        );
    }

    return (
        <div 
            className={`
                flex items-center justify-center h-8 px-2 rounded border text-[10px] font-bold uppercase tracking-wider
                cursor-pointer hover:brightness-95 transition-all
                ${styleClass}
            `}
            title={file.file_name} // Affiche le nom complet au survol (natif navigateur)
            onClick={(e) => {
                e.stopPropagation();
                window.open(url, '_blank');
            }}
        >
            {ext}
        </div>
    );
};