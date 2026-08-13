import storage from '@react-native-firebase/storage';

export const uploadReceiptToStorage = async (
  userId: string,
  imageUri: string,
): Promise<string> => {
  try {
    const filename = `receipts/${userId}_${Date.now()}.jpg`;
    const reference = storage().ref(filename);
    const cleanUri = decodeURIComponent(imageUri);
    await reference.putFile(cleanUri);
    const downloadURL = await reference.getDownloadURL();
    return downloadURL;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
};
