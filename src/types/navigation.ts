export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  Home: undefined;
  Settings: undefined;
  Paywall: { featureKey?: string } | undefined;
  Script: { projectId?: string };
  Record: { projectId: string };
  Review: { projectId: string };
  Export: { projectId: string };
};

export type NewProjectStackParamList = {
  Script: { projectId?: string };
  Record: { projectId: string };
  Review: { projectId: string };
  Export: { projectId: string };
};
