import firebase from "firebase/app";
import "firebase/auth";
import "firebase/analytics";
import "firebase/storage";
import "firebase/firestore";

import firebaseConfig from "./firebase-config";
import store from "../store";

export default {
  PROVIDER_ID_EMAIL_AUTH_PROVIDER: (): string => {
    return firebase.auth.EmailAuthProvider.PROVIDER_ID;
  },
  auth: (): firebase.auth.Auth => {
    return firebase.auth();
  },
  init: (): void => {
    firebase.initializeApp(firebaseConfig);
    firebase.analytics();
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
  },
  signOut: (): void => {
    firebase.auth().signOut();
  },
  onAuth: (): void => {
    firebase.auth().onAuthStateChanged((user) => {
      store.commit("setUser", user);
      store.commit("setSignIn", user?.uid ? true : false);
    });
  },
  fileUpload: (
    file: File,
    callback: (snapshot: firebase.storage.UploadTaskSnapshot) => void
  ): void => {
    const user = firebase.auth().currentUser;
    if (user == null) {
      // 未ログイン
      return;
    }

    const storageRef = firebase.storage().ref();
    const uploadFileRef = storageRef.child(`${user?.uid}/${file.name}`);
    // aタグ download要素 を有効にするため contentDisposition を設定
    const metadata = {
      contentType: file.type,
      contentDisposition: "attachment",
    };
    uploadFileRef.put(file, metadata).then(callback);
  },
  onSnapshot: (
    callback: (
      collection: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>
    ) => void
  ): void => {
    const user = firebase.auth().currentUser;
    if (user == null) {
      // 未ログイン
      return;
    }

    firebase.firestore().collection(user?.uid).onSnapshot(callback);

    /*
    firebase.firestore()
      .collection("tfuru")
      .onSnapshot(callback);
    */
  },
  signInAnonymously(): Promise<void> {
    return new Promise((resolve, reject) => {
      firebase
        .auth()
        .signInAnonymously()
        .then(() => {
          resolve();
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  },
};
