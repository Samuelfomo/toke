// import W from '../../tools/watcher.js';
// import G from '../../tools/glossary.js';
// import SponsorModel from '../model/SponsorModel.js';
//
// export default class Sponsor extends SponsorModel {
//   constructor() {
//     super();
//   }
//
//   // === GETTERS FLUENT ===
//
//   static _load(
//     identifier: any,
//     byGuid: boolean = false,
//     byPhone: boolean = false,
//   ): Promise<Sponsor | null> {
//     return new Sponsor().load(identifier, byGuid, byPhone);
//   }
//
//   static _list(conditions: Record<string, any> = {}): Promise<Sponsor[] | null> {
//     return new Sponsor().list(conditions);
//   }
//
//   getId(): number | undefined {
//     return this.id;
//   }
//
//   getName(): string | undefined {
//     return this.name;
//   }
//
//   // === SETTERS ===
//
//   isRoot(): boolean {
//     return this.root;
//   }
//
//   getDescription(): string | undefined {
//     return this.description;
//   }
//
//   setName(name: string | undefined): Sponsor {
//     this.name = name;
//     return this;
//   }
//
//   // region Méthodes privées
//
//   setRoot(root: boolean): Sponsor {
//     this.root = root;
//     return this;
//   }
//
//   setDescription(description: string | undefined): Sponsor {
//     this.description = description;
//     return this;
//   }
//
//   async save(): Promise<void> {
//     try {
//       this.isNew() ? await this.create() : await this.update();
//     } catch (error: any) {
//       throw new Error(error);
//     }
//   }
//
//   async delete(): Promise<boolean> {
//     if (this.id !== undefined) {
//       await W.isOccur(!this.id, `${G.identifierMissing.code}: Sponsor Delete`);
//       return await this.trash(this.id);
//     }
//     return false;
//   }
//
//   async load(
//     identifier: any,
//     byGuid: boolean = false,
//     byPhone: boolean = false,
//   ): Promise<Sponsor | null> {
//     const data = byGuid
//       ? await this.findByGuid(identifier)
//       : byPhone
//         ? await this.findByPhoneNumber(identifier)
//         : await this.find(Number(identifier));
//     if (!data) return null;
//     return this.hydrate(data);
//   }
//
//   async list(conditions: Record<string, any> = {}): Promise<Sponsor[] | null> {
//     const dataset = await this.listAll(conditions);
//     if (!dataset) return null;
//     return dataset.map((data) => new Sponsor().hydrate(data));
//   }
//
//   /**
//    * Checks whether the current instance is in a 'new' state.
//    *
//    * @return {boolean} True if the instance has no defined ID, indicating it is new; otherwise, false.
//    */
//   isNew(): boolean {
//     return this.id === undefined;
//   }
//
//   /**
//    * Converts the instance properties to a JSON object representation.
//    * @return {object} A JSON object containing the `name` and `token` properties of the instance.
//    */
//   toJSON(): object {
//     return {
//       [RS.GUID]: this.guid,
//       [RS.PHONE_NUMBER]: this.phone_number,
//       [RS.STATUS]: this.status,
//       [RS.METADATA]: this.metadata,
//     };
//   }
//
//   private hydrate(data: any): Sponsor {
//     this.id = data.id;
//     this.guid = data.guid;
//     this.phone_number = data.phone_number;
//     this.status = data.status;
//     this.metadata = data.metadata;
//     return this;
//   }
// }
