import QCTable from "./QCTable";
import { getProductQualityData } from "../actions";

type Props = {
    from: string;
    to: string;
    segment: string;
    hsCodes: string[];
    suppliers: string[];
};

export default async function QCTableServer({
    from,
    to,
    segment,
    hsCodes,
    suppliers,
}: Props) {
    const data = await getProductQualityData(from, to, segment, hsCodes, suppliers);
    return <QCTable data={data} />;
}