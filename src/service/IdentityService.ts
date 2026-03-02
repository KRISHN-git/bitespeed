import { Repository } from "typeorm";
import { AppDataSource } from "../../ormconfig";
import { Contact } from "../entity/Contact";

interface IdentifyInput {
  email?: string | null;
  phoneNumber?: string | null;
}

interface IdentifyOutput {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export class IdentityService {
  private repo: Repository<Contact>;

  constructor() {
    this.repo = AppDataSource.getRepository(Contact);
  }

  async identify(input: IdentifyInput): Promise<IdentifyOutput> {
    const { email, phoneNumber } = input;

    const matchingContacts = await this.findMatchingContacts(email, phoneNumber);

    if (matchingContacts.length === 0) {
      const newContact = this.repo.create({
        email: email ?? null,
        phoneNumber: phoneNumber ?? null,
        linkPrecedence: "primary",
        linkedId: null,
      });
      await this.repo.save(newContact);
      return this.buildResponse([newContact]);
    }

    const primaryIds = new Set<number>();
    for (const c of matchingContacts) {
      if (c.linkPrecedence === "primary") {
        primaryIds.add(c.id);
      } else {
        primaryIds.add(c.linkedId!);
      }
    }

    let allClusterContacts = await this.getFullClusters([...primaryIds]);

    if (primaryIds.size > 1) {
      allClusterContacts = await this.mergeClusters(allClusterContacts);
    }

    const trueEmail = email ?? null;
    const truePhone = phoneNumber ?? null;

    const emailExists = !trueEmail || allClusterContacts.some((c) => c.email === trueEmail);
    const phoneExists = !truePhone || allClusterContacts.some((c) => c.phoneNumber === truePhone);

    if (!emailExists || !phoneExists) {
      const primaryContact = allClusterContacts.find((c) => c.linkPrecedence === "primary")!;
      const secondary = this.repo.create({
        email: trueEmail,
        phoneNumber: truePhone,
        linkedId: primaryContact.id,
        linkPrecedence: "secondary",
      });
      await this.repo.save(secondary);
      allClusterContacts.push(secondary);
    }

    return this.buildResponse(allClusterContacts);
  }

  private async findMatchingContacts(
    email?: string | null,
    phoneNumber?: string | null
  ): Promise<Contact[]> {
    const conditions: object[] = [];
    if (email) conditions.push({ email });
    if (phoneNumber) conditions.push({ phoneNumber });
    if (conditions.length === 0) return [];
    return this.repo.find({ where: conditions });
  }

  private async getFullClusters(primaryIds: number[]): Promise<Contact[]> {
    if (primaryIds.length === 0) return [];
    const primaries = await this.repo.findByIds(primaryIds);
    const secondaries = await this.repo
      .createQueryBuilder("c")
      .where("c.linkedId IN (:...ids)", { ids: primaryIds })
      .getMany();
    return [...primaries, ...secondaries];
  }

  private async mergeClusters(contacts: Contact[]): Promise<Contact[]> {
    const primaries = contacts
      .filter((c) => c.linkPrecedence === "primary")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const winner = primaries[0];
    const losers = primaries.slice(1);

    for (const loser of losers) {
      loser.linkPrecedence = "secondary";
      loser.linkedId = winner.id;
      await this.repo.save(loser);

      await this.repo
        .createQueryBuilder()
        .update(Contact)
        .set({ linkedId: winner.id })
        .where("linkedId = :id", { id: loser.id })
        .execute();
    }

    const allIds = contacts.map((c) => c.id);
    return this.repo.findByIds(allIds);
  }

  private buildResponse(contacts: Contact[]): IdentifyOutput {
  const primary = contacts.find((c) => c.linkPrecedence === "primary")!;
  const secondaries = contacts.filter((c) => c.linkPrecedence === "secondary");

  const allEmails = contacts
    .map((c) => c.email)
    .filter((e): e is string => !!e);

  const allPhones = contacts
    .map((c) => c.phoneNumber)
    .filter((p): p is string => !!p);

  const emails = [
    ...(primary.email ? [primary.email] : []),
    ...allEmails.filter((e) => e !== primary.email),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const phoneNumbers = [
    ...(primary.phoneNumber ? [primary.phoneNumber] : []),
    ...allPhones.filter((p) => p !== primary.phoneNumber),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map((c) => c.id),
    },
  };
}
}