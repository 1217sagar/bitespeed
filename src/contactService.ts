import prisma from "./prismaClient";
import { logger } from "./index";

export interface IdentifyInput {
  email?: string;
  phoneNumber?: string;
}

export class ContactService {
  async identifyContact({ email, phoneNumber }: IdentifyInput) {
    logger.info(
      `identifyContact called with email: ${email}, phoneNumber: ${phoneNumber}`
    );
    if (!email && !phoneNumber) {
      logger.error("At least one of email or phoneNumber is required.");
      throw new Error("At least one of email or phoneNumber is required.");
    }

    let contacts = await this.findMatchingContacts(email, phoneNumber);
    if (contacts.length === 0) {
      logger.info("No matching contacts found. Creating primary contact.");
      return this.createPrimaryContact(email, phoneNumber);
    }

    let allContacts = await this.getAllLinkedContacts(contacts);
    let { primary, primaries } = this.getPrimaryContacts(allContacts);
    if (primaries.length > 1) {
      logger.info(
        `Multiple primaries found (${primaries.length}). Merging primaries.`
      );
      await this.mergePrimaries(primaries, primary);
      allContacts = await this.getAllLinkedContacts([primary]);
    }

    const emails = this.getUniqueEmails(allContacts);
    const phoneNumbers = this.getUniquePhoneNumbers(allContacts);
    let newContact = null;
    if (
      (email && !emails.includes(email)) ||
      (phoneNumber && !phoneNumbers.includes(phoneNumber))
    ) {
      newContact = await this.createSecondaryContact(
        email,
        phoneNumber,
        primary.id
      );
      allContacts.push(newContact);
      if (email && !emails.includes(email)) emails.push(email);
      if (phoneNumber && !phoneNumbers.includes(phoneNumber))
        phoneNumbers.push(phoneNumber);
    }

    const secondaryContactIds = this.getSecondaryContactIds(allContacts);
    return {
      primaryContatctId: primary.id,
      emails: [primary.email, ...emails.filter((e) => e !== primary.email)],
      phoneNumbers: [
        primary.phoneNumber,
        ...phoneNumbers.filter((p) => p !== primary.phoneNumber),
      ],
      secondaryContactIds,
    };
  }

  private async findMatchingContacts(email?: string, phoneNumber?: string) {
    logger.info(
      `Searching for contacts with email: ${email}, phoneNumber: ${phoneNumber}`
    );
    return prisma.contact.findMany({
      where: {
        OR: [
          email ? { email } : undefined,
          phoneNumber ? { phoneNumber } : undefined,
        ].filter(Boolean) as any[],
      },
      orderBy: { createdAt: "asc" },
    });
  }

  private async createPrimaryContact(email?: string, phoneNumber?: string) {
    logger.info(
      `Creating primary contact with email: ${email}, phoneNumber: ${phoneNumber}`
    );
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary",
      },
    });
    return {
      primaryContatctId: newContact.id,
      emails: [newContact.email].filter(Boolean),
      phoneNumbers: [newContact.phoneNumber].filter(Boolean),
      secondaryContactIds: [],
    };
  }

  private async getAllLinkedContacts(contacts: any[]) {
    logger.info(
      `Getting all linked contacts for ids: [${contacts
        .map((c) => c.id)
        .join(", ")}]`
    );
    let allContacts = [...contacts];
    let toCheck = [...contacts];
    const seenIds = new Set(allContacts.map((c) => c.id));
    while (toCheck.length) {
      const ids = toCheck.map((c) => c.id);
      const linked = await prisma.contact.findMany({
        where: {
          OR: [
            { linkedId: { in: ids } },
            {
              id: {
                in: toCheck.map((c) => c.linkedId).filter(Boolean) as number[],
              },
            },
          ],
        },
      });
      toCheck = linked.filter((l: any) => !seenIds.has(l.id));
      toCheck.forEach((c) => seenIds.add(c.id));
      allContacts.push(...toCheck);
    }
    return allContacts;
  }

  private getPrimaryContacts(allContacts: any[]) {
    const primaries = allContacts.filter((c) => c.linkPrecedence === "primary");
    const primary = allContacts.reduce((a, b) =>
      a.createdAt < b.createdAt ? a : b
    );
    logger.info(
      `Primary contacts found: [${primaries.map((c: any) => c.id).join(", ")}]`
    );
    return { primary, primaries };
  }

  private async mergePrimaries(primaries: any[], oldestPrimary: any) {
    logger.info(`Merging primaries. Oldest primary: ${oldestPrimary.id}`);
    for (const p of primaries) {
      if (p.id !== oldestPrimary.id) {
        logger.info(
          `Updating contact ${p.id} to secondary, linking to ${oldestPrimary.id}`
        );
        await prisma.contact.update({
          where: { id: p.id },
          data: {
            linkPrecedence: "secondary",
            linkedId: oldestPrimary.id,
          },
        });
        await prisma.contact.updateMany({
          where: { linkedId: p.id },
          data: { linkedId: oldestPrimary.id },
        });
      }
    }
  }

  private getUniqueEmails(allContacts: any[]) {
    const emails = Array.from(
      new Set(allContacts.map((c) => c.email).filter(Boolean))
    );
    logger.info(`Unique emails: [${emails.join(", ")}]`);
    return emails;
  }

  private getUniquePhoneNumbers(allContacts: any[]) {
    const phoneNumbers = Array.from(
      new Set(allContacts.map((c) => c.phoneNumber).filter(Boolean))
    );
    logger.info(`Unique phone numbers: [${phoneNumbers.join(", ")}]`);
    return phoneNumbers;
  }

  private async createSecondaryContact(
    email?: string,
    phoneNumber?: string,
    linkedId?: number
  ) {
    logger.info(
      `Creating secondary contact with email: ${email}, phoneNumber: ${phoneNumber}, linkedId: ${linkedId}`
    );
    return prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "secondary",
        linkedId,
      },
    });
  }

  private getSecondaryContactIds(allContacts: any[]) {
    const ids = allContacts
      .filter((c) => c.linkPrecedence === "secondary")
      .map((c) => c.id);
    logger.info(`Secondary contact IDs: [${ids.join(", ")}]`);
    return ids;
  }
}
