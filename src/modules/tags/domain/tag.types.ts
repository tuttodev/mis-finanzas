export type Tag = {
  id: string;
  name: string;
  isSystem: boolean;
  usageCount?: number;
};

export type CreateTagInput = {
  name: string;
};
