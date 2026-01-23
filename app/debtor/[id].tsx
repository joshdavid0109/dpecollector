import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PaymentModal from "../../src/components/PaymentModal";
import { getLoanDetail } from "../../src/services/loans";
import { recordPayment } from "../../src/services/payments";

export default function LoanDetail() {
  const { debtor_id, loan_id } = useLocalSearchParams();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [modalVisible, setModalVisible] = useState(false);

  async function load() {
    setLoading(true);
    const loanData = await getLoanDetail(Number(loan_id));
    setData(loanData);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const { debtor, loan, schedule, next } = data;

  function toggle(id: number | string) {
    const key = String(id);
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <View style={styles.container}>
        {/* BACK + HEADER */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#0a84ff" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{debtor.name}</Text>
            <Text style={styles.subtitle}>Loan #{loan.loan_id}</Text>
          </View>
        </View>

        {/* NEXT DUE CARD */}
        <View style={styles.box}>
          <Text style={styles.label}>Next Due:</Text>
          <Text style={styles.amount}>₱{next.remaining.toLocaleString()}</Text>
          <Text style={{ marginTop: 4 }}>
            Due on {format(parseISO(next.due_date), "MMM d, yyyy")}
          </Text>

          <TouchableOpacity
            style={styles.payButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              Record Payment
            </Text>
          </TouchableOpacity>
        </View>

        {/* SCHEDULE TITLE */}
        <Text style={styles.sectionTitle}>Payment Schedule</Text>

        <FlatList
          data={schedule}
          keyExtractor={(i) => String(i.schedule_id)}
          renderItem={({ item }) => (
            <View>
              {/* Payment Row */}
              <View style={styles.scheduleRow}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => toggle(item.schedule_id)}
                >
                  <Text style={styles.paymentNo}>Payment #{item.payment_no}</Text>

                  <Text style={styles.scheduleLine}>
                    Due Date: {format(parseISO(item.due_date), "MMM d, yyyy")}
                  </Text>

                  <Text style={styles.scheduleLine}>
                    Amount Due: ₱{item.amortization.toLocaleString()}
                  </Text>

                  <Text style={styles.scheduleLine}>
                    Remaining: ₱{item.remaining.toLocaleString()}
                  </Text>


                  {item.is_fully_paid ? (
                    <Text style={{ color: "green", marginTop: 4 }}>Fully Paid</Text>
                  ) : item.total_paid > 0 ? (
                    <Text style={{ color: "orange", marginTop: 4 }}>
                      Partially Paid
                    </Text>
                  ) : (
                    <Text style={{ color: "red", marginTop: 4 }}>Unpaid</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => toggle(item.schedule_id)}>
                  <Ionicons
                    name={open[String(item.schedule_id)] ? "chevron-up" : "chevron-down"}
                    size={20}
                    style={{ alignSelf: "center" }}
                  />
                </TouchableOpacity>
              </View>

              {/* Dropdown (partials) */}
              {open[String(item.schedule_id)] && (
                <View style={styles.dropdown}>
                  <Text style={styles.sectionSub}>Partial Payments</Text>

                  {item.partials?.length === 0 ? (
                    <Text style={{ color: "#666" }}>No partial payments yet.</Text>
                  ) : (
                    item.partials.map((p) => (
                      <View key={p.payment_id} style={{ marginTop: 6 }}>
                        <Text>₱{p.amount_paid.toLocaleString()}</Text>
                        <Text style={{ fontSize: 12, color: "#666" }}>
                          {format(parseISO(p.payment_date), "MMM d, yyyy")}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}
          ListFooterComponent={<View style={{ height: 50 }} />}
        />

        {/* Payment Modal */}
        <PaymentModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          debtorName={debtor.name}
          defaultAmount={next.remaining}
          maxAmount={next.remaining}
          onSubmit={async (amount, note) => {
            await recordPayment(data, amount, note);
            await load();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingTop: 4,
  },
  backBtn: { paddingRight: 12, paddingVertical: 4 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { marginTop: 2, color: "#555" },

  box: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    elevation: 2,
  },
  label: { fontSize: 16, fontWeight: "600" },
  amount: { fontSize: 28, fontWeight: "700", marginTop: 6 },
  payButton: {
    marginTop: 16,
    backgroundColor: "#0a84ff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  sectionTitle: { marginTop: 24, fontWeight: "700", fontSize: 16 },
  sectionSub: { fontWeight: "700", fontSize: 14, marginBottom: 6 },

  scheduleRow: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    elevation: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  paymentNo: { fontSize: 16, fontWeight: "700" },
  scheduleLine: { marginTop: 4, fontSize: 13, color: "#444" },

  dropdown: {
    backgroundColor: "#fff",
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 10,
    marginTop: -6,
    marginBottom: 6,
    elevation: 1,
  },
});
