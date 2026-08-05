import { Tabs, router } from "expo-router";
import React, { useEffect } from "react";

import { BottomNavbar } from "@/components/bottom-navbar";
import { useAuth } from "@/context/AuthContext";

export default function TabLayout() {
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading && !token) {
      // not authenticated, send to sign-in
      router.replace("/sign-in");
    }
  }, [loading, token]);

  if (loading || !token) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: {
          backgroundColor: "#FFFFFF",
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
      tabBar={(props) =>
        props.state.routes[props.state.index]?.name === "record" ? null : (
          <BottomNavbar {...props} />
        )
      }
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: "Record",
        }}
      />
      <Tabs.Screen
        name="heatmap"
        options={{
          title: "Heatmaps",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: "Notifications",
        }}
      />
    </Tabs>
  );
}
