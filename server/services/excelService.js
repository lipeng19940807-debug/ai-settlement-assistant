import ExcelJS from 'exceljs';
import { createReadStream } from 'fs';
import { extname } from 'path';

/**
 * 解析 Excel/CSV 文件，提取工作表和字段信息
 */
export async function parseExcelFile(filePath, fileName) {
    const workbook = new ExcelJS.Workbook();
    const ext = extname(fileName).toLowerCase();

    if (ext === '.csv') {
        await workbook.csv.readFile(filePath);
    } else {
        await workbook.xlsx.readFile(filePath);
    }

    const sheets = [];
    let totalRowCount = 0;

    workbook.eachSheet((worksheet, sheetId) => {
        const fields = [];
        const headerRow = worksheet.getRow(1);

        // 提取表头字段
        headerRow.eachCell((cell, colNumber) => {
            const colLetter = getColumnLetter(colNumber);
            const sampleValue = getSampleValue(worksheet, colNumber);
            const fieldType = inferFieldType(worksheet, colNumber);

            fields.push({
                id: `field-${sheetId}-${colNumber}`,
                name: String(cell.value || `Column ${colLetter}`),
                type: fieldType,
                sample: sampleValue,
                column: colLetter
            });
        });

        const rowCount = worksheet.rowCount - 1; // 减去表头
        totalRowCount += rowCount;

        sheets.push({
            name: worksheet.name,
            fields,
            rowCount
        });
    });

    return { sheets, totalRowCount };
}

/**
 * 获取文件预览数据（前 N 行）
 */
export async function getPreviewData(filePath, fileName, sheetName = null, limit = 30) {
    const workbook = new ExcelJS.Workbook();
    const ext = extname(fileName).toLowerCase();

    if (ext === '.csv') {
        await workbook.csv.readFile(filePath);
    } else {
        await workbook.xlsx.readFile(filePath);
    }

    const worksheet = sheetName
        ? workbook.getWorksheet(sheetName)
        : workbook.worksheets[0];

    if (!worksheet) {
        throw new Error('工作表不存在');
    }

    const headers = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
        headers.push({
            key: `col_${colNumber}`,
            label: String(cell.value || `Column ${colNumber}`)
        });
    });

    const data = [];
    for (let rowNumber = 2; rowNumber <= Math.min(worksheet.rowCount, limit + 1); rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = { index: rowNumber - 1 };

        headerRow.eachCell((cell, colNumber) => {
            const dataCell = row.getCell(colNumber);
            rowData[`col_${colNumber}`] = formatCellValue(dataCell);
        });

        data.push(rowData);
    }

    return { headers, data, sheetName: worksheet.name };
}

/**
 * 导出处理后的数据为 Excel
 */
export async function exportToExcel(processedData, templateName) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('处理结果');

    if (processedData.length === 0) {
        return workbook;
    }

    // 设置表头
    const headers = Object.keys(processedData[0]);
    worksheet.columns = headers.map(header => ({
        header,
        key: header,
        width: 20
    }));

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF197FE6' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // 添加数据行
    processedData.forEach(row => {
        worksheet.addRow(row);
    });

    return workbook;
}

// 辅助函数
function getColumnLetter(colNumber) {
    let letter = '';
    while (colNumber > 0) {
        const mod = (colNumber - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        colNumber = Math.floor((colNumber - 1) / 26);
    }
    return letter;
}

function getSampleValue(worksheet, colNumber, sampleRow = 2) {
    const cell = worksheet.getCell(sampleRow, colNumber);
    return formatCellValue(cell);
}

function formatCellValue(cell) {
    if (cell.value === null || cell.value === undefined) {
        return '';
    }
    if (cell.value instanceof Date) {
        return cell.value.toISOString().split('T')[0];
    }
    if (typeof cell.value === 'object' && cell.value.text) {
        return cell.value.text;
    }
    if (typeof cell.value === 'object' && cell.value.result !== undefined) {
        return String(cell.value.result);
    }
    return String(cell.value);
}

function inferFieldType(worksheet, colNumber) {
    // 检查前 10 行数据来推断类型
    const samples = [];
    for (let row = 2; row <= Math.min(worksheet.rowCount, 11); row++) {
        const cell = worksheet.getCell(row, colNumber);
        if (cell.value !== null && cell.value !== undefined) {
            samples.push(cell.value);
        }
    }

    if (samples.length === 0) return 'String';

    // 检查是否为日期
    if (samples.some(v => v instanceof Date)) {
        return 'Date';
    }

    // 检查是否为数字
    if (samples.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
        if (samples.some(v => String(v).includes('.'))) {
            return 'Float';
        }
        return 'Integer';
    }

    return 'String';
}
