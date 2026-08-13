import storage from '@react-native-firebase/storage';

export const uploadReceiptToStorage = async (
  userId: string,
  base64Data: string,
): Promise<string> => {
  try {
    const filename = `receipts/${userId}_${Date.now()}.jpg`;
    const reference = storage().ref(filename);
    await reference.putString(base64Data, 'base64', { contentType: 'image/jpeg' });
    const downloadURL = await reference.getDownloadURL();
    return downloadURL;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
};
