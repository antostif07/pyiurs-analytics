import { Database } from "./database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type DocumentColumn = Database["public"]["Tables"]["document_columns"]["Row"]
export type SubColumn = Database["public"]["Tables"]["sub_columns"]["Row"]
export type CellData = Database["public"]["Tables"]["cell_data"]["Row"]
export type DocumentRow = Database["public"]["Tables"]["document_rows"]["Row"]
export type FileAttachment = Database["public"]["Tables"]["file_attachments"]["Row"]
export type MultilineData = Database["public"]["Tables"]["multiline_data"]["Row"]
export type Document = Database["public"]["Tables"]["documents"]["Row"]
export type Attendance = Database["public"]["Tables"]["attendances"]["Row"]