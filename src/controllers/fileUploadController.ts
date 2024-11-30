import { IncomingForm, File } from 'formidable';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

export const uploadFile = (req: Request, res: Response) => {
  const uploadDir = path.resolve(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = new IncomingForm({
    uploadDir:uploadDir,
    keepExtensions: true,
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      logger.error('Error parsing the files', err);
      return res.status(500).json({ message: 'Error parsing the files' });
    }

    // Check if files.file is an array and handle accordingly
    const fileArray = files.file;
    if (!fileArray || Array.isArray(fileArray) && fileArray.length === 0) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // If it's an array, take the first file
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

    const newPath = path.join(uploadDir, file.newFilename);

    fs.rename(file.filepath, newPath, (err) => {
      if (err) {
        logger.error('Error saving the file', err);
        return res.status(500).json({ message: 'Error saving the file' });
      }

      // Return the file path in the response
      res.status(200).json({ message: 'File uploaded successfully', filePath: newPath });
    });
  });
};
