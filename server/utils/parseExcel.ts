import xlsx from "xlsx";

export const extractNumbersFromExcel = (buffer: Buffer): string[] => {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = xlsx.utils.sheet_to_json<any>(sheet);

  const numbers = jsonData.map((row) => row.number || row.Number || row.phone || row.Phone).filter(Boolean);
  return numbers;
};
