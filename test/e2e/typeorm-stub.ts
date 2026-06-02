type Decorator = ClassDecorator & PropertyDecorator;

const decorator = (): Decorator => () => undefined;

export const Column = decorator;
export const CreateDateColumn = decorator;
export const DeleteDateColumn = decorator;
export const Entity = decorator;
export const Index = decorator;
export const JoinColumn = decorator;
export const ManyToOne = decorator;
export const OneToMany = decorator;
export const PrimaryGeneratedColumn = decorator;
export const Unique = decorator;
export const UpdateDateColumn = decorator;

export class Brackets {
  constructor(readonly callback: unknown) {}
}

export class DataSource {
  constructor(readonly options: unknown) {}
}

export class QueryFailedError extends Error {}

export function MoreThan(value: unknown): unknown {
  return value;
}

export function Not(value: unknown): unknown {
  return value;
}
