import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import Page1Screen from '../screens/Page1Screen';
import Page2Screen from '../screens/Page2Screen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'เมนูหลัก' }} />
        <Stack.Screen name="Page1" component={Page1Screen} options={{ title: 'บันทึกรายรับ' }} />
        <Stack.Screen name="Page2" component={Page2Screen} options={{ title: 'บันทึกรายจ่าย' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}