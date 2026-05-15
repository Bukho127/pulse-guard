import { Tabs } from 'expo-router';
import React from 'react';

import { BottomNavbar } from '@/components/bottom-navbar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) =>
        props.state.routes[props.state.index]?.name === 'record' ? null : <BottomNavbar {...props} />
      }>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
        }}
      />
      <Tabs.Screen
        name="heatmap"
        options={{
          title: 'Heatmaps',
        }}
      />
    </Tabs>
  );
}
