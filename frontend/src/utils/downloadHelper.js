import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { jsPDF } from 'jspdf';

/**
 * Escapes a single cell value for a CSV record.
 */
export const escapeCSVField = (val) => {
  if (val === null || val === undefined) return '';
  const stringVal = String(val);
  if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
};

/**
 * Generates a CSV file and downloads it (web) or saves it directly to storage (Capacitor).
 */
export const downloadStatement = async ({ filename, headers, rows, memberName }) => {
  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map(row => row.map(escapeCSVField).join(','))
  ].join('\n');

  const cleanFilename = (filename || 'Statement.csv').replace(/[^a-zA-Z0-9._-]/g, '_');
  const isCapacitor = Capacitor.isNativePlatform();

  if (isCapacitor) {
    try {
      try {
        const perm = await Filesystem.checkPermissions();
        if (perm.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      } catch (permErr) {
        console.warn('[downloadHelper] Permission check warning:', permErr);
      }

      let result;
      try {
        result = await Filesystem.writeFile({
          path: cleanFilename,
          data: csvContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true
        });
      } catch (docErr) {
        console.warn('[downloadHelper] Documents write failed, trying Cache fallback:', docErr);
        result = await Filesystem.writeFile({
          path: cleanFilename,
          data: csvContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
          recursive: true
        });
      }

      if (!result || !result.uri) {
        throw new Error('No URI returned from Filesystem.writeFile');
      }

      return { success: true, uri: result.uri };
    } catch (error) {
      console.error('[downloadHelper] Capacitor CSV write error:', error);
      throw new Error('Unable to download CSV.');
    }
  } else {
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', cleanFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, isWeb: true };
    } catch (error) {
      console.error('[downloadHelper] Web CSV download error:', error);
      throw new Error('Unable to download CSV.');
    }
  }
};

/**
 * Native & Web PDF Export.
 * Converts jsPDF instance to Blob -> Base64 -> Capacitor Filesystem (or Web Anchor Download).
 * Saves PDF directly to phone storage without invoking native Share sheet.
 */
export const exportPdfToAndroid = async (doc, filename) => {
  if (!doc) {
    throw new Error('Invalid PDF document instance provided');
  }

  const pdfBlob = doc.output('blob');
  
  const base64Pdf = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('FileReader failed to convert PDF Blob to Base64'));
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string') {
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64Data);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    reader.readAsDataURL(pdfBlob);
  });

  const cleanFilename = (filename || 'Statement.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const isCapacitor = Capacitor.isNativePlatform();

  if (isCapacitor) {
    try {
      try {
        const perm = await Filesystem.checkPermissions();
        if (perm.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      } catch (permErr) {
        console.warn('[downloadHelper] Permission check warning:', permErr);
      }

      let result;
      try {
        result = await Filesystem.writeFile({
          path: cleanFilename,
          data: base64Pdf,
          directory: Directory.Documents,
          recursive: true
        });
      } catch (docErr) {
        console.warn('[downloadHelper] Documents write failed, trying Cache fallback:', docErr);
        result = await Filesystem.writeFile({
          path: cleanFilename,
          data: base64Pdf,
          directory: Directory.Cache,
          recursive: true
        });
      }

      if (!result || !result.uri) {
        throw new Error('Capacitor Filesystem.writeFile failed: No file URI returned');
      }

      try {
        await Share.share({
          title: cleanFilename,
          text: 'SHEmpower Financial PDF Statement',
          url: result.uri,
          dialogTitle: 'Open / Save PDF Statement'
        });
      } catch (shareErr) {
        console.warn('[downloadHelper] Share dialog warning:', shareErr);
      }

      return { success: true, uri: result.uri };
    } catch (writeErr) {
      console.error('[downloadHelper] Filesystem.writeFile failed:', writeErr);
      throw new Error('Unable to download PDF.');
    }
  } else {
    try {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', cleanFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (webErr) {
      console.warn('Blob URL trigger fallback to doc.save:', webErr);
      doc.save(cleanFilename);
    }
    return { success: true, isWeb: true };
  }
};

/**
 * PDF Statement Generator for Savings and Loan statements.
 * Constructs clean English PDFs from data arrays.
 */
export const downloadPDFStatement = async ({ 
  filename, 
  title, 
  type = 'savings', 
  headers, 
  rows = [], 
  memberName = '', 
  memberId = '' 
}) => {
  try {
    const doc = new jsPDF();

    // Header Title Bar (Primary Warm Brown #8B5E3C)
    doc.setFillColor(139, 94, 60);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('SHEmpower Financial Record', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Empowering Women through Financial Inclusion', 14, 22);

    const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Generated: ${dateStr}`, 196, 18, { align: 'right' });

    // Profile Details
    doc.setTextColor(45, 55, 72);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title ? title.toUpperCase() : 'FINANCIAL STATEMENT DETAILS', 14, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (memberName) doc.text(`Member Name: ${memberName}`, 14, 46);
    if (memberId) doc.text(`Member ID: ${memberId}`, 14, 53);

    const statementLabel = type === 'savings' ? 'SAVINGS PASSBOOK LEDGER' : 'LOAN RECORD';
    doc.text(`Statement: ${statementLabel}`, 14, memberName ? 60 : 46);

    const lineY = memberName ? 65 : 51;
    doc.setDrawColor(231, 226, 217);
    doc.setLineWidth(0.5);
    doc.line(14, lineY, 196, lineY);

    // Table Header Section
    let y = lineY + 9;
    doc.setFillColor(250, 247, 242);
    doc.rect(14, y - 5, 182, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(139, 94, 60);

    const defaultHeaders = type === 'savings'
      ? ['Date', 'Deposit', 'Balance']
      : ['Date', 'Loan Amount', 'Paid Amount', 'Interest', 'Remaining Balance'];

    const activeHeaders = headers && headers.length ? headers : defaultHeaders;
    const colCount = activeHeaders.length;

    if (colCount === 3) {
      doc.text(activeHeaders[0], 16, y);
      doc.text(activeHeaders[1], 130, y, { align: 'right' });
      doc.text(activeHeaders[2], 194, y, { align: 'right' });
    } else if (colCount === 5) {
      doc.text(activeHeaders[0], 16, y);
      doc.text(activeHeaders[1], 65, y, { align: 'right' });
      doc.text(activeHeaders[2], 105, y, { align: 'right' });
      doc.text(activeHeaders[3], 145, y, { align: 'right' });
      doc.text(activeHeaders[4], 194, y, { align: 'right' });
    } else {
      const step = 170 / colCount;
      activeHeaders.forEach((h, idx) => {
        doc.text(h, 16 + idx * step, y, { align: idx === 0 ? 'left' : 'right' });
      });
    }

    doc.line(14, y + 3, 196, y + 3);
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(45, 55, 72);

    if (!rows || rows.length === 0) {
      doc.text('No records found.', 105, y + 5, { align: 'center' });
      y += 15;
    } else {
      rows.forEach(row => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFillColor(250, 247, 242);
          doc.rect(14, y - 5, 182, 8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(139, 94, 60);

          if (colCount === 3) {
            doc.text(activeHeaders[0], 16, y);
            doc.text(activeHeaders[1], 130, y, { align: 'right' });
            doc.text(activeHeaders[2], 194, y, { align: 'right' });
          } else if (colCount === 5) {
            doc.text(activeHeaders[0], 16, y);
            doc.text(activeHeaders[1], 65, y, { align: 'right' });
            doc.text(activeHeaders[2], 105, y, { align: 'right' });
            doc.text(activeHeaders[3], 145, y, { align: 'right' });
            doc.text(activeHeaders[4], 194, y, { align: 'right' });
          }
          doc.line(14, y + 3, 196, y + 3);
          y += 9;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(45, 55, 72);
        }

        if (colCount === 3) {
          doc.text(String(row[0] || ''), 16, y);
          doc.text(String(row[1] || ''), 130, y, { align: 'right' });
          doc.text(String(row[2] || ''), 194, y, { align: 'right' });
        } else if (colCount === 5) {
          doc.text(String(row[0] || ''), 16, y);
          doc.text(String(row[1] || ''), 65, y, { align: 'right' });
          doc.text(String(row[2] || ''), 105, y, { align: 'right' });
          doc.text(String(row[3] || ''), 145, y, { align: 'right' });
          doc.text(String(row[4] || ''), 194, y, { align: 'right' });
        } else {
          const step = 170 / colCount;
          row.forEach((cell, idx) => {
            doc.text(String(cell || ''), 16 + idx * step, y, { align: idx === 0 ? 'left' : 'right' });
          });
        }

        doc.line(14, y + 2, 196, y + 2);
        y += 8;
      });
    }

    let cleanFilename = filename;
    if (!cleanFilename) {
      const cleanMemberName = (memberName || '').trim().replace(/[^a-zA-Z0-9]/g, '_');
      if (type === 'savings') {
        cleanFilename = cleanMemberName ? `SHEmpower_Savings_Passbook_${cleanMemberName}.pdf` : 'SHEmpower_Savings_Passbook.pdf';
      } else {
        cleanFilename = cleanMemberName ? `SHEmpower_Loan_Records_${cleanMemberName}.pdf` : 'SHEmpower_Loan_Records.pdf';
      }
    }

    return await exportPdfToAndroid(doc, cleanFilename);
  } catch (err) {
    console.error('PDF Generation Failure:', err);
    throw new Error('Unable to download PDF.');
  }
};

