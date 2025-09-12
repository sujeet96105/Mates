// types/firebase-auth-react-native.d.ts

import type { Persistence, Auth } from "firebase/auth";
import type { ReactNativeAsyncStorage } from "@react-native-async-storage/async-storage";

declare module "firebase/auth" {
  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage
  ): Persistence;
}
