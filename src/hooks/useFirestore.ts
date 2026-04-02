import useSWRSubscription from 'swr/subscription';
import { collection, query, where, QueryConstraint, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export type QueryOption = {
  field: string;
  op: "==" | "<" | "<=" | ">" | ">=" | "in" | "array-contains" | "array-contains-any";
  value: any;
};

export function useFirestoreCollection(collectionName: string, options: QueryOption[] = []) {
  const key = options.length > 0 
    ? `${collectionName}?q=${btoa(JSON.stringify(options))}` 
    : collectionName;

  const { data, error } = useSWRSubscription(
    key,
    (key, { next }) => {
      let q: any = collection(db, collectionName);
      if (options.length > 0) {
        const constraints = options.map(opt => where(opt.field, opt.op, opt.value));
        q = query(q, ...constraints);
      }
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          const docs = snapshot.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
          next(null, docs);
        },
        (err: any) => next(err)
      );
      
      return () => unsubscribe();
    }
  );

  return {
    data: data || [],
    loading: !error && data === undefined,
    error,
  };
}

export function useFirestoreDocument(collectionName: string, documentId: string | null) {
  const key = documentId ? `${collectionName}/${documentId}` : null;

  const { data, error } = useSWRSubscription(
    key,
    (key, { next }) => {
      if (!documentId) return () => {};
      
      const unsubscribe = onSnapshot(
        doc(db, collectionName, documentId),
        (docSnap: any) => {
          if (docSnap.exists()) {
            next(null, { id: docSnap.id, ...(docSnap.data() as any) });
          } else {
            next(null, null);
          }
        },
        (err: any) => next(err)
      );
      
      return () => unsubscribe();
    }
  );

  return {
    data,
    loading: documentId ? !error && data === undefined : false,
    error,
  };
}


