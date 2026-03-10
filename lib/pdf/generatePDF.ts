/**
 * Generador de PDF de cierre de ciclo.
 * Usa html2canvas + jsPDF para capturar el componente React renderizado.
 * Solo se ejecuta en el cliente (browser).
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PDFOptions {
  userName: string;
  career: string;
  cycleLabel: string;    // ej: "Ciclo 10 — 2025-I"
  endDate: Date;
  semester: string;
  elementId: string;     // id del elemento HTML a capturar
  filename?: string;
}

export async function generateCyclePDF(options: PDFOptions): Promise<void> {
  const {
    cycleLabel,
    semester,
    elementId,
    filename = `Scholar_Ciclo10_2025I.pdf`,
  } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento #${elementId} no encontrado en el DOM.`);
  }

  // Esperar a que todo esté renderizado
  await new Promise((resolve) => setTimeout(resolve, 300));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#fdfcf8",
    logging: false,
    allowTaint: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");
  let yOffset = 0;
  const pageHeight = 297; // A4 height in mm

  // Si el contenido es más largo que una página, lo dividimos
  let heightLeft = imgHeight;

  pdf.addImage(imgData, "PNG", 0, yOffset, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    yOffset -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, yOffset, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
