import { View, Button, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Button title="บันทึกรายรับ" onPress={() => navigation.navigate('Page1')} />
      <Button title="บันทึกรายจ่าย" onPress={() => navigation.navigate('Page2')} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }
});