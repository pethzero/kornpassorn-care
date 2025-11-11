import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert } from 'react-native';
import { loadAll, addRecord,seedSample, exportJSON } from '../services/recordService';

export default function Page1Screen() {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [store, setStore] = useState({ records: [] });

  useEffect(() => {
    (async () => {
      await seedSample(); // ลอง seed ครั้งแรกเพื่อเช็คการเขียน
      const s = await loadAll();
      console.log('loadAll on mount ->', s);
      setStore(s);
    })();
  }, []);

  const onAdd = async () => {
    if (!title || !amount) {
      Alert.alert('กรอกข้อมูลให้ครบ');
      return;
    }
    const rec = await addRecord({ title, amount, type: 'income' });
    console.log('added record ->', rec);
    const s = await loadAll();
    console.log('store after add ->', s);
    setStore(s);
    setTitle('');
    setAmount('');
  };

  const onExport = async () => {
    const json = await exportJSON();
    console.log('export JSON ->', json);
    Alert.alert('Exported JSON (console)');
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>บันทึกรายรับ</Text>
      <TextInput placeholder="ชื่อรายการ" value={title} onChangeText={setTitle} style={{ borderWidth: 1, padding: 8, borderRadius: 6, marginBottom: 8 }} />
      <TextInput placeholder="จำนวนเงิน" value={amount} onChangeText={setAmount} keyboardType="numeric" style={{ borderWidth: 1, padding: 8, borderRadius: 6, marginBottom: 8 }} />
      <Button title="บันทึก" onPress={onAdd} />
      <View style={{ height: 12 }} />
      <Button title="Export JSON (log)" onPress={onExport} />
      <FlatList
        data={store.records}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
            <Text>{item.title} - {item.amount} บาท</Text>
            <Text style={{ color: '#666' }}>{item.date}</Text>
          </View>
        )}
      />
    </View>
  );
}