import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

const TEAL = [13, 148, 136];
const DARK = [31, 41, 55];
const MUTED = [107, 114, 128];
const PAGE = { width: 210, height: 297, margin: 16 };

const printable = (value, fallback = '—') => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text || fallback;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getPhotoBlob = async (photo) => {
  if (!photo?.url) throw new Error('The saved photo URL is missing.');
  const apiRoot = new URL(api.defaults.baseURL.replace(/\/api\/?$/, ''), window.location.origin);
  const url = new URL(photo.url, apiRoot).toString();
  const response = await api.get(url, { responseType: 'blob' });
  if (!response.data?.size) throw new Error('The photo file is empty or unavailable.');
  return response.data;
};

const blobToJpeg = async (blob) => {
  let bitmap;
  let objectUrl;
  try {
    if ('createImageBitmap' in window) {
      bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      return { data: canvas.toDataURL('image/jpeg', 0.9), width: canvas.width, height: canvas.height };
    }

    objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.src = objectUrl;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('The browser could not decode this photo.'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return { data: canvas.toDataURL('image/jpeg', 0.9), width: canvas.width, height: canvas.height };
  } finally {
    bitmap?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
};

const addSectionTitle = (doc, title, y) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEAL);
  doc.text(title.toUpperCase(), PAGE.margin, y);
  doc.setDrawColor(220, 229, 229);
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, y + 2, PAGE.width - PAGE.margin, y + 2);
};

const addPageBranding = (doc, entry) => {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(1.1);
    doc.line(PAGE.margin, 11, PAGE.width - PAGE.margin, 11);
    if (page > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...TEAL);
      doc.text('TANISH TECHNOLOGY  |  WORK ENTRY REPORT', PAGE.margin, 8);
    }
    doc.setDrawColor(220, 229, 229);
    doc.setLineWidth(0.25);
    doc.line(PAGE.margin, PAGE.height - 13, PAGE.width - PAGE.margin, PAGE.height - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(printable(entry.workOrderNumber), PAGE.margin, PAGE.height - 8);
    doc.text(`Page ${page} of ${pageCount}`, PAGE.width - PAGE.margin, PAGE.height - 8, { align: 'right' });
  }
};

export const downloadWorkEntryPdf = async (entry) => {
  if (!entry?._id) throw new Error('Work Entry details are not available. Refresh the entry and try again.');

  const doc = new jsPDF({ format: 'a4', unit: 'mm', orientation: 'portrait', compress: true });
  const assignedKarigars = entry.karigars?.length ? entry.karigars : entry.karigar ? [entry.karigar] : [];
  const materials = entry.materials || [];
  const photos = entry.photos || [];

  doc.setFillColor(...TEAL);
  doc.rect(0, 0, PAGE.width, 37, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('TANISH TECHNOLOGY', PAGE.margin, 15);
  doc.setFontSize(11);
  doc.text('Work Entry Report', PAGE.margin, 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Reference: ${printable(entry.workOrderNumber)}`, PAGE.margin, 30);
  doc.text(`Generated: ${formatDate(new Date())}`, PAGE.width - PAGE.margin, 30, { align: 'right' });

  let y = 47;
  addSectionTitle(doc, 'Work information', y);
  autoTable(doc, {
    startY: y + 5,
    theme: 'plain',
    margin: { left: PAGE.margin, right: PAGE.margin },
    styles: { font: 'helvetica', fontSize: 9, textColor: DARK, cellPadding: 2.2, overflow: 'linebreak' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38, textColor: MUTED }, 1: { cellWidth: 'auto' } },
    body: [
      ['Work Entry date', formatDate(entry.workDate)],
      ['Customer / Business', printable(entry.customerName)],
      ['Phone number', printable(entry.customerPhone)],
      ['Installation address', printable(entry.customerAddress)],
    ],
  });
  y = doc.lastAutoTable.finalY + 9;

  addSectionTitle(doc, `Assigned Karigars (${assignedKarigars.length})`, y);
  autoTable(doc, {
    startY: y + 5,
    theme: 'striped',
    margin: { left: PAGE.margin, right: PAGE.margin },
    head: [['Name', 'Contact number']],
    body: assignedKarigars.length
      ? assignedKarigars.map((karigar) => [printable(karigar.fullName, 'Karigar'), printable(karigar.phone)])
      : [['No assigned Karigar recorded', '—']],
    headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9, textColor: DARK, cellPadding: 2.5, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 105 }, 1: { cellWidth: 'auto' } },
  });
  y = doc.lastAutoTable.finalY + 9;

  addSectionTitle(doc, 'Materials issued', y);
  autoTable(doc, {
    startY: y + 5,
    theme: 'striped',
    margin: { left: PAGE.margin, right: PAGE.margin },
    head: [['Product name', 'Model number', 'Issued', 'Unit', 'Returned']],
    body: materials.length
      ? materials.map((material) => [
          printable(material.productNameSnapshot || material.product?.name, 'Product'),
          printable(material.product?.modelNumber),
          String(material.issuedQuantity ?? '—'),
          printable(material.unitSnapshot || material.product?.unit),
          String(material.returnedQuantity ?? 0),
        ])
      : [['No materials recorded', '—', '—', '—', '—']],
    headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 8, textColor: DARK, cellPadding: 2.3, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 67 }, 1: { cellWidth: 35 }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 27 }, 4: { cellWidth: 27, halign: 'right' } },
    didDrawPage: () => {},
  });
  y = doc.lastAutoTable.finalY + 9;

  if (entry.notes?.trim()) {
    if (y > PAGE.height - 32) {
      doc.addPage();
      y = 22;
    }
    addSectionTitle(doc, 'Work notes & installation instructions', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    const noteLines = doc.splitTextToSize(entry.notes.trim(), PAGE.width - PAGE.margin * 2);
    doc.text(noteLines, PAGE.margin, y + 8, { lineHeightFactor: 1.45 });
    y += 10 + noteLines.length * 4.2;
  }

  const imageFailures = [];
  if (photos.length) {
    if (y > PAGE.height - 55) {
      doc.addPage();
      y = 23;
    }
    addSectionTitle(doc, `Work photos (${photos.length})`, y);
    y += 8;

    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      if (y > PAGE.height - 40) {
        doc.addPage();
        y = 23;
      }
      const caption = `Photo ${index + 1} of ${photos.length}`;
      let image;
      try {
        image = await blobToJpeg(await getPhotoBlob(photo));
      } catch (error) {
        imageFailures.push({ name: photo.originalName || photo.filename || caption, message: error.message });
      }

      if (!image) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 25, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(185, 28, 28);
        doc.text(`${caption} could not be loaded`, PAGE.margin + 4, y + 9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(doc.splitTextToSize(imageFailures.at(-1).message, PAGE.width - PAGE.margin * 2 - 8), PAGE.margin + 4, y + 16);
        y += 32;
        continue;
      }

      const maxWidth = PAGE.width - PAGE.margin * 2;
      const maxHeight = PAGE.height - 46;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      if (y + height + 8 > PAGE.height - 16) {
        doc.addPage();
        y = 23;
      }
      const x = (PAGE.width - width) / 2;
      doc.addImage(image.data, 'JPEG', x, y, width, height, undefined, 'MEDIUM');
      y += height + 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(caption, PAGE.margin, y);
      y += 8;
    }
  }

  addPageBranding(doc, entry);
  const safeReference = printable(entry.workOrderNumber, 'work-entry').replace(/[^a-z0-9-_]/gi, '-');
  doc.save(`Tanish-Technology-${safeReference}.pdf`);
  return imageFailures;
};
