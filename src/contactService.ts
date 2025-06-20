import prisma from "./prismaClient";

export interface IdentifyInput {
  email?: string;
  phoneNumber?: string;
}

export class ContactService {
  async identifyContact({ email, phoneNumber }: IdentifyInput) {
    if (!email && !phoneNumber) {
      throw new Error("At least one of email or phoneNumber is required.");
    }

    let contacts = await this.findMatchingContacts(email, phoneNumber);
    if (contacts.length === 0) {
      return this.createPrimaryContact(email, phoneNumber);
    }

    let allContacts = await this.getAllLinkedContacts(contacts);
    let { primary, primaries } = this.getPrimaryContacts(allContacts);
    if (primaries.length > 1) {
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
    return { primary, primaries };
  }

  private async mergePrimaries(primaries: any[], oldestPrimary: any) {
    for (const p of primaries) {
      if (p.id !== oldestPrimary.id) {
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
    return Array.from(new Set(allContacts.map((c) => c.email).filter(Boolean)));
  }

  private getUniquePhoneNumbers(allContacts: any[]) {
    return Array.from(
      new Set(allContacts.map((c) => c.phoneNumber).filter(Boolean))
    );
  }

  private async createSecondaryContact(
    email?: string,
    phoneNumber?: string,
    linkedId?: number
  ) {
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
    return allContacts
      .filter((c) => c.linkPrecedence === "secondary")
      .map((c) => c.id);
  }
}
