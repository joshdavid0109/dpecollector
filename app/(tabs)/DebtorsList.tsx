import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../src/constants/theme";
import { getAllDebtors } from "../../src/services/debtors";

type PaymentStatus =
  | "PAID"
  | "PAID LATE"
  | "DUE TODAY"
  | "OVERDUE"
  | "UNPAID";

const isActiveLoan = (loan: any) =>
  loan.status !== "Completed" &&
  loan.is_completed !== true &&
  Number(loan.remaining ?? 0) > 0;



/** Normalize date to midnight */
const normalize = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Compute payment status */
const getPaymentStatus = (dueDateISO: string) => {
  const today = normalize(new Date());
  const dueDate = normalize(parseISO(dueDateISO));

  if (today.getTime() === dueDate.getTime()) {
    return { label: "DUE TODAY", color: theme.colors.primary };
  }

  if (today > dueDate) {
    return { label: "OVERDUE", color: theme.colors.danger };
  }

  const diff = differenceInCalendarDays(dueDate, today);
  return {
    label: diff === 1 ? "DUE TOMORROW" : `IN ${diff} DAYS`,
    color: theme.colors.gray,
  };
};

export default function DebtorsList() {
  const router = useRouter();

  const [debtors, setDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  /** Fetch data */
  useEffect(() => {
    loadDebtors();
  }, []);

  const loadDebtors = async () => {
    setLoading(true);
    const data = await getAllDebtors();
    setDebtors(data);
    setLoading(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDebtors().then(() => setRefreshing(false));
  }, []);

  /** Individual Debtor Row */
  const renderItem = ({ item }: { item: any }) => {
    const isOpen = expanded === item.id;
    const activeLoans = item.loans.filter(isActiveLoan);
    const nextStatus = getPaymentStatus(item.earliest_due);

    return (
      <View style={styles.card}>
        {/* Debtor Header */}
        <TouchableOpacity onPress={() => setExpanded(isOpen ? null : item.id)}>
          <Text style={styles.name}>{item.name}</Text>

          <Text style={styles.subtitle}>
            {activeLoans.length} active loan{activeLoans.length !== 1 ? "s" : ""}
          </Text>


          <Text style={styles.balance}>
            ₱{item.total_balance.toLocaleString()}
          </Text>

          <View style={styles.statusRow}>
            <Text style={styles.date}>
              Next due: {format(parseISO(item.earliest_due), "MMM d, yyyy")}
            </Text>

            <View
              style={[
                styles.statusBadge,
                { borderColor: nextStatus.color },
              ]}
            >
              <Text style={{ color: nextStatus.color, fontWeight: "700" }}>
                {nextStatus.label}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded Loan List */}
        {isOpen && (
          <View style={{ marginTop: 12 }}>
            {item.loans
              .filter(isActiveLoan)
              .map((loan: any) => {
              const loanStatus = getPaymentStatus(loan.next_due);

              return (
                <TouchableOpacity
                  key={loan.loan_id}
                  style={styles.loanCard}
                  onPress={() => router.push(`/debtor/loan/${loan.loan_id}`)}
                >
                  <View style={styles.loanHeader}>
                    <Text style={styles.loanTitle}>Loan #{loan.loan_id}</Text>
                    <Text
                      style={[
                        styles.loanStatus,
                        { color: loanStatus.color },
                      ]}
                    >
                      {loanStatus.label}
                    </Text>
                  </View>

                  <Text>
                    Remaining: ₱{loan.remaining.toLocaleString()}
                  </Text>
                  <Text>
                    Due: {format(parseISO(loan.next_due), "MMM d, yyyy")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerIcon}>
          <Image
            source={{
              uri: "https://cwcscejvwfbsrmrjsdxq.supabase.co/storage/v1/object/public/icons/DPE_logo.png",
            }}
            style={styles.headerImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.headerText}>Debtors</Text>
      </View>

      <FlatList
        data={debtors.filter(d =>
          d.loans?.some(isActiveLoan)
        )}
        keyExtractor={(i) => i.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ padding: 20 }}>
              <Text style={{ textAlign: "center", color: theme.colors.gray }}>
                No debtors found.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },

  headerContainer: {
    alignItems: "center",
    marginBottom: 16,
  },

  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  headerImage: { width: 36, height: 36 },

  headerText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },

  /* Debtor Card */
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    elevation: 2,
  },

  name: { fontSize: 18, fontWeight: "700" },
  subtitle: { color: "#666", marginTop: 4 },
  balance: { fontSize: 16, fontWeight: "700", marginTop: 10 },
  date: { color: theme.colors.gray },

  statusRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
  },

  /* Loan Cards */
  loanCard: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },

  loanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  loanTitle: { fontWeight: "600", fontSize: 16 },
  loanStatus: { fontSize: 12, fontWeight: "700" },
});
