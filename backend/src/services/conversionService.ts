import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { promisify } from 'util';
import { prisma } from '../config/database';
import { config } from '../config/config';
import { storageService } from './storage';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

const CONVERTIBLE_EXTENSIONS = ['.ppt', '.pptx'];
const CONVERSION_TIMEOUT_MS = 3 * 60 * 1000;

export function needsPdfConversion(fileName: string): boolean {
  return CONVERTIBLE_EXTENSIONS.includes(path.extname(fileName).toLowerCase());
}

/**
 * Converts PPT/PPTX materials to PDF with headless LibreOffice.
 *
 * Classroom Raspberry Pis show PDFs far more reliably than PowerPoint files,
 * so every presentation gets a PDF copy stored next to the original.
 * If conversion fails the Pi falls back to opening the original file.
 */
export class ConversionService {
  async convertMaterial(materialId: string, buffer: Buffer, storedFileName: string, relativePath: string) {
    const workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'smartclass-convert-'));
    const inputPath = path.join(workDir, storedFileName);

    try {
      await fs.promises.writeFile(inputPath, buffer);

      // A per-run profile dir lets several conversions run at once
      const profileUrl = pathToFileURL(path.join(workDir, 'profile')).href;
      await execFileAsync(
        config.storage.sofficePath,
        [`-env:UserInstallation=${profileUrl}`, '--headless', '--convert-to', 'pdf', '--outdir', workDir, inputPath],
        { timeout: CONVERSION_TIMEOUT_MS }
      );

      const pdfName = path.basename(storedFileName, path.extname(storedFileName)) + '.pdf';
      const pdfBuffer = await fs.promises.readFile(path.join(workDir, pdfName));
      const pdfRelativePath = path.posix.join(path.posix.dirname(relativePath), pdfName);

      await storageService.saveFile(pdfBuffer, pdfRelativePath);
      await prisma.material.update({
        where: { id: materialId },
        data: { pdfRelativePath, conversionStatus: 'DONE' },
      });

      logger.info('Material converted to PDF', { materialId, pdfRelativePath });
    } catch (error) {
      await prisma.material.update({
        where: { id: materialId },
        data: { conversionStatus: 'FAILED' },
      });
      logger.error('PDF conversion failed', {
        materialId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await fs.promises.rm(workDir, { recursive: true, force: true });
    }
  }
}

export const conversionService = new ConversionService();
