import React from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import {Colors, Spacing, BorderRadius} from '../theme';
import {useOrder, OrderMode} from '../context/OrderContext';

const {width} = Dimensions.get('window');

interface OrderModeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (mode: OrderMode) => void;
}

const OrderModeModal: React.FC<OrderModeModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            How would you like to get your order?
          </Text>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => onSelect('pickup')}>
            <View style={styles.optionContent}>
              <View style={styles.imagePlaceholder}>
                {/* In a real app, use the asset provided by the user. 
                      Since I don't have the image file, I'll use a local mock or icon.
                      The user provided images in the prompt, so I'll try to match the UI. */}
                <Image
                  source={{
                    uri: 'https://cdn-icons-png.flaticon.com/512/3081/3081013.png',
                  }}
                  style={styles.modeImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.optionText}>SELF PICKUP</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, styles.deliveryButton]}
            onPress={() => onSelect('delivery')}>
            <View style={styles.optionContent}>
              <View style={styles.imagePlaceholder}>
                <Image
                  source={{
                    uri: 'https://cdn-icons-png.flaticon.com/512/2830/2830305.png',
                  }}
                  style={styles.modeImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.optionText}>DELIVERY</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  optionButton: {
    width: '100%',
    backgroundColor: '#D1E6F5', // Light blue from screenshot
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  deliveryButton: {
    backgroundColor: '#F5F5F5', // Off white/grey from screenshot
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    marginRight: Spacing.md,
  },
  modeImage: {
    width: '100%',
    height: '100%',
  },
  optionText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A3365', // Dark blue from screenshot
    letterSpacing: 1,
  },
});

export default OrderModeModal;
