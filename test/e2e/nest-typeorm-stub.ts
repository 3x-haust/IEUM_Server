export function InjectRepository(): PropertyDecorator & ParameterDecorator {
  return () => undefined;
}

export function getRepositoryToken(entity: unknown): unknown {
  return entity;
}
