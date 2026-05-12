// Core types for the Notion clone

export type BlockType =
  | "text"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "bullet-list"
  | "numbered-list"
  | "todo"
  | "toggle"
  | "toggle-heading-1"
  | "toggle-heading-2"
  | "toggle-heading-3"
  | "quote"
  | "callout"
  | "divider"
  | "code"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "embed"
  | "bookmark"
  | "page-link"
  | "sub-page"
  | "database-inline"
  | "database-linked"
  | "columns"
  | "column"
  | "table-of-contents"
  | "breadcrumb"
  | "equation"
  | "synced-block"
  | "synced-block-ref"
  | "ai-block"
  | "table"
  | "button";

export interface BaseBlock {
  id: string;
  type: BlockType;
  parentId: string | null; // page id or block id (for nested toggles, columns)
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface TextBlock extends BaseBlock {
  type:
    | "text"
    | "heading-1"
    | "heading-2"
    | "heading-3"
    | "bullet-list"
    | "numbered-list"
    | "quote";
  content: string;
  color?: BlockColor;
}

export interface TodoBlock extends BaseBlock {
  type: "todo";
  content: string;
  checked: boolean;
  color?: BlockColor;
}

export interface ToggleBlock extends BaseBlock {
  type: "toggle" | "toggle-heading-1" | "toggle-heading-2" | "toggle-heading-3";
  content: string;
  open: boolean;
  color?: BlockColor;
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  content: string;
  emoji: string;
  color?: BlockColor;
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export interface CodeBlock extends BaseBlock {
  type: "code";
  content: string;
  language: string;
  caption?: string;
}

export interface MediaBlock extends BaseBlock {
  type: "image" | "video" | "audio" | "file";
  url: string;
  caption?: string;
  fileName?: string;
}

export interface EmbedBlock extends BaseBlock {
  type: "embed" | "bookmark";
  url: string;
  caption?: string;
}

export interface PageLinkBlock extends BaseBlock {
  type: "page-link" | "sub-page";
  pageId: string;
}

export interface DatabaseInlineBlock extends BaseBlock {
  type: "database-inline" | "database-linked";
  databaseId: string;
  viewId?: string;
}

export interface ColumnsBlock extends BaseBlock {
  type: "columns";
  columns: number; // count of columns (children are column blocks)
  /** Ordered ids of the contained ColumnBlock children. */
  columnIds?: string[];
}

export interface ColumnBlock extends BaseBlock {
  type: "column";
  width?: number; // fraction
  /** Ordered child blocks inside this column. */
  blockIds?: string[];
}

export interface TableOfContentsBlock extends BaseBlock {
  type: "table-of-contents";
  color?: BlockColor;
}

export interface BreadcrumbBlock extends BaseBlock {
  type: "breadcrumb";
}

export interface EquationBlock extends BaseBlock {
  type: "equation";
  content: string;
}

export interface SyncedBlock extends BaseBlock {
  type: "synced-block";
  // children blocks reference this id
}

export interface SyncedBlockRef extends BaseBlock {
  type: "synced-block-ref";
  sourceId: string; // the synced-block original id
}

export interface AIBlock extends BaseBlock {
  type: "ai-block";
  prompt: string;
  result: string;
}

export interface TableBlock extends BaseBlock {
  type: "table";
  rows: string[][]; // simple table
  hasHeaderRow: boolean;
  hasHeaderCol: boolean;
}

export interface ButtonBlock extends BaseBlock {
  type: "button";
  label: string;
  emoji?: string;
  actions: ButtonAction[];
}

export type ButtonAction =
  | { kind: "insert-block"; blockType: BlockType; content?: string }
  | { kind: "edit-property"; databaseId: string; propertyId: string; value: unknown }
  | { kind: "add-page-to"; databaseId: string }
  | { kind: "open-page"; pageId: string }
  | { kind: "show-confirmation"; message: string }
  | { kind: "send-webhook"; url: string; payload?: string };

export type Block =
  | TextBlock
  | TodoBlock
  | ToggleBlock
  | CalloutBlock
  | DividerBlock
  | CodeBlock
  | MediaBlock
  | EmbedBlock
  | PageLinkBlock
  | DatabaseInlineBlock
  | ColumnsBlock
  | ColumnBlock
  | TableOfContentsBlock
  | BreadcrumbBlock
  | EquationBlock
  | SyncedBlock
  | SyncedBlockRef
  | AIBlock
  | TableBlock
  | ButtonBlock;

export type BlockColor =
  | "default"
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "gray-bg"
  | "brown-bg"
  | "orange-bg"
  | "yellow-bg"
  | "green-bg"
  | "blue-bg"
  | "purple-bg"
  | "pink-bg"
  | "red-bg";

export interface Page {
  id: string;
  workspaceId: string;
  teamspaceId: string | null;
  parentId: string | null; // parent page id, null = root
  title: string;
  icon: string | null; // emoji
  cover: string | null; // url
  blocks: string[]; // ordered block ids
  isFavorite: boolean;
  isInTrash: boolean;
  trashedAt: number | null;
  isPublished: boolean;
  publishSlug: string | null;
  isWiki: boolean;
  pageOwners: string[]; // user ids
  verifiedAt: number | null;
  verifiedBy: string | null;
  verificationExpiresAt: number | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  lastEditedBy: string;
  // permissions overrides (default inherits from parent)
  permissions: PermissionRule[];
  history: PageVersion[];
}

export interface PageVersion {
  id: string;
  savedAt: number;
  savedBy: string;
  snapshot: { title: string; blocks: Record<string, Block> };
}

export interface PermissionRule {
  subjectType: "user" | "group" | "everyone" | "guest";
  subjectId: string | null;
  level: "full_access" | "edit" | "edit_content" | "comment" | "view" | "no_access";
}

// =========== DATABASE ============

export type PropertyType =
  | "title"
  | "text"
  | "number"
  | "select"
  | "multi-select"
  | "status"
  | "date"
  | "person"
  | "files"
  | "checkbox"
  | "url"
  | "email"
  | "phone"
  | "formula"
  | "relation"
  | "rollup"
  | "created-time"
  | "created-by"
  | "last-edited-time"
  | "last-edited-by"
  | "unique-id"
  | "verification"
  | "button";

export interface SelectOption {
  id: string;
  name: string;
  color: BlockColor;
}

export interface StatusGroup {
  id: string;
  name: "To-do" | "In progress" | "Done";
  optionIds: string[];
}

export interface BaseProperty {
  id: string;
  name: string;
  type: PropertyType;
}

export interface TitleProperty extends BaseProperty {
  type: "title";
}
export interface TextProperty extends BaseProperty {
  type: "text";
}
export interface NumberProperty extends BaseProperty {
  type: "number";
  format: "number" | "number-with-commas" | "percent" | "dollar" | "euro" | "pound" | "yen";
}
export interface SelectProperty extends BaseProperty {
  type: "select" | "multi-select";
  options: SelectOption[];
}
export interface StatusProperty extends BaseProperty {
  type: "status";
  options: SelectOption[];
  groups: StatusGroup[];
}
export interface DateProperty extends BaseProperty {
  type: "date";
  includeTime?: boolean;
}
export interface PersonProperty extends BaseProperty {
  type: "person";
}
export interface FilesProperty extends BaseProperty {
  type: "files";
}
export interface CheckboxProperty extends BaseProperty {
  type: "checkbox";
}
export interface URLProperty extends BaseProperty {
  type: "url";
}
export interface EmailProperty extends BaseProperty {
  type: "email";
}
export interface PhoneProperty extends BaseProperty {
  type: "phone";
}
export interface FormulaProperty extends BaseProperty {
  type: "formula";
  expression: string;
}
export interface RelationProperty extends BaseProperty {
  type: "relation";
  targetDatabaseId: string;
  isDual: boolean;
  // when dual, the property id created in target db
  pairedPropertyId?: string;
}
export interface RollupProperty extends BaseProperty {
  type: "rollup";
  relationPropertyId: string;
  targetPropertyId: string;
  function: "count" | "count-values" | "sum" | "average" | "min" | "max" | "earliest" | "latest" | "show-original" | "percent-empty" | "percent-not-empty";
}
export interface CreatedTimeProperty extends BaseProperty {
  type: "created-time";
}
export interface CreatedByProperty extends BaseProperty {
  type: "created-by";
}
export interface LastEditedTimeProperty extends BaseProperty {
  type: "last-edited-time";
}
export interface LastEditedByProperty extends BaseProperty {
  type: "last-edited-by";
}
export interface UniqueIdProperty extends BaseProperty {
  type: "unique-id";
  prefix?: string;
}
export interface VerificationProperty extends BaseProperty {
  type: "verification";
}
export interface ButtonProperty extends BaseProperty {
  type: "button";
  label: string;
  emoji?: string;
  actions: ButtonAction[];
}

export type Property =
  | TitleProperty
  | TextProperty
  | NumberProperty
  | SelectProperty
  | StatusProperty
  | DateProperty
  | PersonProperty
  | FilesProperty
  | CheckboxProperty
  | URLProperty
  | EmailProperty
  | PhoneProperty
  | FormulaProperty
  | RelationProperty
  | RollupProperty
  | CreatedTimeProperty
  | CreatedByProperty
  | LastEditedTimeProperty
  | LastEditedByProperty
  | UniqueIdProperty
  | VerificationProperty
  | ButtonProperty;

export type ViewType =
  | "table"
  | "board"
  | "gallery"
  | "list"
  | "calendar"
  | "timeline"
  | "chart"
  | "form"
  | "map";

export interface Filter {
  id: string;
  propertyId: string;
  operator: string;
  value: unknown;
  combinator?: "and" | "or";
}

export interface Sort {
  id: string;
  propertyId: string;
  direction: "asc" | "desc";
}

export interface BaseView {
  id: string;
  name: string;
  type: ViewType;
  filters: Filter[];
  sorts: Sort[];
  hiddenProperties: string[];
  propertyOrder: string[];
}

export interface TableView extends BaseView {
  type: "table";
  wrapCells: boolean;
}
export interface BoardView extends BaseView {
  type: "board";
  groupBy: string; // property id
  hiddenGroups: string[];
}
export interface CalendarView extends BaseView {
  type: "calendar";
  dateProperty: string;
}
export interface TimelineView extends BaseView {
  type: "timeline";
  startProperty: string;
  endProperty?: string;
}
export interface GalleryView extends BaseView {
  type: "gallery";
  cardSize: "small" | "medium" | "large";
  fitImage: boolean;
}
export interface ListView extends BaseView {
  type: "list";
}
export interface ChartView extends BaseView {
  type: "chart";
  chartType: "bar" | "line" | "donut" | "number";
  xProperty?: string;
  yProperty?: string;
  aggregation?: "count" | "sum" | "avg" | "min" | "max";
}
export interface FormView extends BaseView {
  type: "form";
  title: string;
  description: string;
  submitMessage: string;
  conditionalLogic?: ConditionalRule[];
}
export interface MapView extends BaseView {
  type: "map";
  locationProperty: string;
}

export interface ConditionalRule {
  id: string;
  ifPropertyId: string;
  operator: "equals" | "not-equals" | "is-empty" | "is-not-empty";
  value: unknown;
  showPropertyIds: string[];
}

export type View =
  | TableView
  | BoardView
  | CalendarView
  | TimelineView
  | GalleryView
  | ListView
  | ChartView
  | FormView
  | MapView;

export interface DatabaseRow {
  id: string;
  databaseId: string;
  values: Record<string, unknown>; // propertyId -> value
  blocks: string[]; // page blocks (each row is also a page)
  /** Stable sequence number assigned at creation time. Survives row deletion. */
  uniqueIdSeq?: number;
  icon?: string | null;
  cover?: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  lastEditedBy: string;
  isInTrash: boolean;
}

export interface DatabaseTemplate {
  id: string;
  name: string;
  icon?: string;
  values: Record<string, unknown>;
  blockTemplates: Block[]; // simple block templates for page body
  recurring?: {
    frequency: "daily" | "weekly" | "monthly";
    weekdays?: number[];
    time?: string;
  };
}

export interface NotionDatabase {
  id: string;
  workspaceId: string;
  parentId: string | null; // parent page id
  name: string;
  description: string;
  icon: string | null;
  cover: string | null;
  isInline: boolean;
  properties: Property[];
  views: View[];
  rows: string[]; // ordered row ids
  templates: DatabaseTemplate[];
  /** Strictly-monotonic counter used to assign a stable unique-id to each row.
   *  Independent of array position so deletion doesn't shift IDs. */
  nextUniqueId?: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  isInTrash: boolean;
}

// =========== TEAMSPACE & WORKSPACE ============

export interface Teamspace {
  id: string;
  workspaceId: string;
  name: string;
  icon: string;
  description: string;
  mode: "open" | "closed" | "private";
  memberIds: string[];
  ownerIds: string[];
  createdAt: number;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

export interface Workspace {
  id: string;
  name: string;
  icon: string;
  ownerId: string;
  memberIds: string[];
  groups: Group[];
  plan: "free" | "plus" | "business" | "enterprise";
  aiCredits: number; // remaining credits
  guests: { userId: string; pageIds: string[] }[];
  createdAt: number;
}

// =========== COMMENTS ============

export interface Comment {
  id: string;
  pageId: string;
  blockId?: string | null; // null = page comment
  parentId?: string | null; // for threading
  authorId: string;
  /** Snapshot of the author display name at the time the comment was posted
   *  so the comment doesn't follow the currently-signed-in user. */
  authorName?: string;
  authorAvatar?: string;
  content: string;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
}

// =========== USERS ============

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string; // emoji or color
  createdAt: number;
}

// =========== TEMPLATES ============

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  cover?: string;
  category: string;
  blocks: Block[];
  title: string;
  isCommunity?: boolean;
  authorName?: string;
}

// =========== AUTOMATIONS ============

export interface Automation {
  id: string;
  databaseId: string;
  name: string;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  enabled: boolean;
}

export type AutomationTrigger =
  | { kind: "page-added" }
  | { kind: "property-edited"; propertyId: string }
  | { kind: "schedule"; cron: string }
  | { kind: "page-deleted" };

export type AutomationAction =
  | { kind: "edit-property"; propertyId: string; value: unknown }
  | { kind: "send-notification"; userId: string; message: string }
  | { kind: "add-to-database"; targetDatabaseId: string; values: Record<string, unknown> }
  | { kind: "send-webhook"; url: string };

// =========== CALENDAR ============

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  allDay: boolean;
  description: string;
  location: string;
  meetingUrl?: string;
  calendarSource: "personal" | "work" | "google" | "apple" | "notion-db";
  sourceDbId?: string;
  sourceRowId?: string;
  color?: string;
}

// =========== MAIL ============

export interface Mail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  receivedAt: number;
  read: boolean;
  starred: boolean;
  archived: boolean;
  trash: boolean;
  labels: string[];
  threadId: string;
  snippet?: string;
}
