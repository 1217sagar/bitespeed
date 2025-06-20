import { Request, Response } from 'express';
import { ContactService } from './contactService';

const contactService = new ContactService();

export const identifyContactController = async (req: Request, res: Response) => {
  try {
    const result = await contactService.identifyContact(req.body);
    res.json({ contact: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}; 