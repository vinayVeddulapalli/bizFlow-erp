import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#ffffff',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#14b8a6', // Teal
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'POS Billing',
          headerTitle: 'BizFlow POS Counter',
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          headerTitle: 'Sales Invoices',
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          headerTitle: 'Customer Directory',
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync Manager',
          headerTitle: 'Offline Outbox Sync',
        }}
      />
    </Tabs>
  );
}
