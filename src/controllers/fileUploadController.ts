import { IncomingForm } from 'formidable';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const uploadFile = (req: Request, res: Response) => {
  const form = new IncomingForm();
  form.uploadDir = path.join(__dirname, '../uploads');
  form.keepExtensions = true;

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Error parsing the files', err);
      return res.status(500).json({ message: 'Error parsing the files' });
    }

    const file = files.file as formidable.File;
    const newPath = path.join(form.uploadDir, file.newFilename);

    fs.rename(file.filepath, newPath, (err) => {
      if (err) {
        console.error('Error saving the file', err);
        return res.status(500).json({ message: 'Error saving the file' });
      }

      res.status(200).json({ message: 'File uploaded successfully', filePath: newPath });
    });
  });
};