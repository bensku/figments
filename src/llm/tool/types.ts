export type ToolFieldMeta =
    | {
          type: 'int';
          key: string;
          description?: string;
          default?: number;
          min?: number;
          max?: number;
      }
    | {
          type: 'number';
          key: string;
          description?: string;
          default?: number;
          min?: number;
          max?: number;
      }
    | {
          type: 'enum';
          key: string;
          description?: string;
          default?: string;
          values: string[];
      }
    | {
          type: 'string';
          key: string;
          description?: string;
          default?: string;
      }
    | {
          type: 'boolean';
          key: string;
          description?: string;
          default?: boolean;
      };

export interface ToolMeta {
    id: string;
    fields: ToolFieldMeta[];
}
