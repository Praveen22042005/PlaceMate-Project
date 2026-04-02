import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationType = 'application_status' | 'interview_scheduled' | 'general';

export interface BaseNotification {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface Notification extends BaseNotification {
  id: string;
}

export const addNotification = async (payload: Omit<BaseNotification, 'read' | 'createdAt'>) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...payload,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding notification:', error);
  }
};

export const markNotificationRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification read:', error);
  }
};
