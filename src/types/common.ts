type FullDefinitions = Record<
  | "__DEVELOPMENT__"
  | "__TEST__"
  | "__TEST_JEST__"
  | "__PRODUCTION__"
  | "__BACKEND_SERVICES_STRING__"
  | "__FRONTEND_SERVICES_STRING__"
  | "__SUBDOMAIN__",
  string | boolean
>;

export type BackendDefinitions = FullDefinitions;
export type FrontendDefinitions = Omit<
  FullDefinitions,
  "__BACKEND_SERVICES_STRING__" | "__FRONTEND_SERVICES_STRING__"
>;

export interface ServiceInfo {
  subdomain: string;
  toBuild: boolean;
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | Array<JSONValue>
  | JSONObject;

interface JSONObject {
  [key: string]: JSONValue;
}
