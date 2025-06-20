"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNumbersFromExcel = void 0;
const xlsx_1 = __importDefault(require("xlsx"));
const extractNumbersFromExcel = (buffer) => {
    const workbook = xlsx_1.default.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = xlsx_1.default.utils.sheet_to_json(sheet);
    const numbers = jsonData.map((row) => row.number || row.Number || row.phone || row.Phone).filter(Boolean);
    return numbers;
};
exports.extractNumbersFromExcel = extractNumbersFromExcel;
