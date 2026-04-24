import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export async function parseFile(file: File): Promise<Record<string, any[]>> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve({ [file.name]: results.data });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } else if (extension === 'xlsx' || extension === 'xls') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const result: Record<string, any[]> = {};
          workbook.SheetNames.forEach((name) => {
            result[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
          });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  throw new Error('Unsupported file format');
}

export function computeStats(data: any[]) {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);
  const stats: any = {};

  columns.forEach((col) => {
    const values = data.map((row) => row[col]).filter((val) => val !== null && val !== undefined);
    const isNumeric = values.every((val) => typeof val === 'number');

    if (isNumeric && values.length > 0) {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const median = sorted[Math.floor(sorted.length / 2)];
      
      // Standard Deviation
      const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
      const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);

      stats[col] = {
        type: 'numeric',
        min, max, mean, median, stdDev, sum,
        count: values.length,
        missing: data.length - values.length
      };
    } else {
      const counts: Record<string, number> = {};
      values.forEach((v) => {
        counts[v] = (counts[v] || 0) + 1;
      });
      const unique = Object.keys(counts).length;
      const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const mostFrequent = sortedCounts[0] ? sortedCounts[0][0] : null;

      stats[col] = {
        type: 'text',
        unique,
        mostFrequent,
        count: values.length,
        missing: data.length - values.length
      };
    }
  });

  return stats;
}
