import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { styles } from "./styles";
import {
  formatDate,
  getAgendaIcon,
  toDateTimeLocalValue,
} from "./utils/dateUtils";
import { getStatusLabel } from "./utils/statusUtils";
import AdminCluesPanel from "./components/admin/AdminClues";
import SuspectDashboardPanel from "./components/suspect/SuspectDashboard";
import SharedSuspectImage from "./components/shared/SuspectImage";
import SharedStatusBadge from "./components/shared/StatusBadge";
import SharedLoadingBlock from "./components/shared/LoadingBlock";
import SharedMessageBlock from "./components/shared/MessageBlock";

// Finale/eindrapporten staan bewust uit: het eindverhaal wordt als gratis aanwijzing gedeeld.
const ENABLE_FINAL_REPORTS = false;

export default function App() {
  const reloadTimer = useRef(null);
  const isTypingRef = useRef(false);
  const editClueFileRef = useRef(null);
  const editSuspectFileRef = useRef(null);
  const finalReportMotiveRef = useRef(null);
  const finalReportEvidenceRef = useRef(null);

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [groups, setGroups] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [suspects, setSuspects] = useState([]);
  const [agendaItems, setAgendaItems] = useState([]);

  const [notifications, setNotifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [clues, setClues] = useState([]);
  const [clueCategories, setClueCategories] = useState([]);
  const [groupClues, setGroupClues] = useState([]);
  const [suspectNotes, setSuspectNotes] = useState([]);
  const [suspectStatuses, setSuspectStatuses] = useState([]);

  const [activeParticipantTab, setActiveParticipantTab] = useState("dashboard");
  const [activeAdminTab, setActiveAdminTab] = useState("dashboard");
  const [selectedParticipantSuspect, setSelectedParticipantSuspect] =
    useState("");
  const [selectedSuspectDossier, setSelectedSuspectDossier] = useState("");
  const [selectedInterrogationSuspect, setSelectedInterrogationSuspect] =
    useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [editingGroupId, setEditingGroupId] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [manualClueGroup, setManualClueGroup] = useState("");
  const [manualClueId, setManualClueId] = useState("");
  const [manualClueMode, setManualClueMode] = useState("single");
  const [selectedManualClueGroups, setSelectedManualClueGroups] = useState([]);
  const [selectedSuspectUser, setSelectedSuspectUser] = useState("");
  const [selectedProfileSuspect, setSelectedProfileSuspect] = useState("");

  const [newSuspectName, setNewSuspectName] = useState("");
  const [newSuspectDescription, setNewSuspectDescription] = useState("");
  const [newSuspectPhotoUrl, setNewSuspectPhotoUrl] = useState("");

  const [editingSuspectId, setEditingSuspectId] = useState("");
  const [editSuspectName, setEditSuspectName] = useState("");
  const [editSuspectDescription, setEditSuspectDescription] = useState("");
  const [editSuspectPhotoUrl, setEditSuspectPhotoUrl] = useState("");

  const [newAgenda, setNewAgenda] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    item_type: "activity",
    credits_reward: "0",
    is_visible: true,
  });

  const [newClueTitle, setNewClueTitle] = useState("");
  const [newClueDescription, setNewClueDescription] = useState("");
  const [newCluePrice, setNewCluePrice] = useState("5");
  const [newClueSuspect, setNewClueSuspect] = useState("");
  const [newClueCategory, setNewClueCategory] = useState("");
  const [newClueIsFree, setNewClueIsFree] = useState(false);
  const [newClueIsGlobal, setNewClueIsGlobal] = useState(false);
  const [editingClueId, setEditingClueId] = useState("");
  const [editClueTitle, setEditClueTitle] = useState("");
  const [editClueDescription, setEditClueDescription] = useState("");
  const [editCluePrice, setEditCluePrice] = useState("0");
  const [editClueSuspect, setEditClueSuspect] = useState("");
  const [editClueCategory, setEditClueCategory] = useState("");
  const [editClueIsFree, setEditClueIsFree] = useState(false);
  const [editClueIsGlobal, setEditClueIsGlobal] = useState(false);
  const [editClueIsVisible, setEditClueIsVisible] = useState(true);

  const [newClueCategoryName, setNewClueCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editClueCategoryName, setEditClueCategoryName] = useState("");

  const [editingAgendaId, setEditingAgendaId] = useState("");
  const [editAgenda, setEditAgenda] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    item_type: "activity",
    credits_reward: "0",
    is_visible: true,
  });

  const [newNotificationGroup, setNewNotificationGroup] = useState("");
  const [newNotificationTitle, setNewNotificationTitle] = useState("");
  const [newNotificationMessage, setNewNotificationMessage] = useState("");
  const [notificationMode, setNotificationMode] = useState("single");
  const [selectedNotificationGroups, setSelectedNotificationGroups] = useState(
    []
  );

  const [creditGroup, setCreditGroup] = useState("");
  const [creditAmount, setCreditAmount] = useState("5");
  const [creditReason, setCreditReason] = useState("");

  const [selectedNoteSuspect, setSelectedNoteSuspect] = useState("");
  const [newNote, setNewNote] = useState("");
  const [selectedStatusSuspect, setSelectedStatusSuspect] = useState("");
  const [newStatus, setNewStatus] = useState("unknown");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [editNoteText, setEditNoteText] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [imageModal, setImageModal] = useState(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState({});
  const [gameMode, setGameMode] = useState("test");

  const isLandingDomain =
    window.location.hostname === "www.csi-hit.nl" ||
    window.location.hostname === "csi-hit.nl";

  const [isLoading, setIsLoading] = useState(false);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [latestBackupInfo, setLatestBackupInfo] = useState(null);
  const [finalReportsOpen, setFinalReportsOpen] = useState(false);
  const [finalReports, setFinalReports] = useState([]);

  const [finalReportSuspect, setFinalReportSuspect] = useState("");
  const [finalReportMotive, setFinalReportMotive] = useState("");
  const [finalReportEvidence, setFinalReportEvidence] = useState("");
  const [showFinalReportEditor, setShowFinalReportEditor] = useState(false);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setError("");
    }, 7000);

    return () => clearTimeout(timer);
  }, [error]);

  const myMemberships = useMemo(() => {
    if (!profile) return [];
    return memberships.filter((m) => m.user_id === profile.id);
  }, [memberships, profile]);

  const myGroups = useMemo(() => {
    return myMemberships
      .map((m) => m.groups || groups.find((g) => g.id === m.group_id))
      .filter(Boolean);
  }, [myMemberships, groups]);

  const myGroup = myGroups[0];

  const purchasedClueIds = useMemo(() => {
    return groupClues.map((g) => g.clue_id);
  }, [groupClues]);

  const visibleAgendaItems = useMemo(() => {
    return agendaItems
      .filter((item) => item.is_visible || profile?.role === "admin")
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  }, [agendaItems, profile]);

  const nextAgendaItem = useMemo(() => {
    const now = new Date();
    return visibleAgendaItems.find((item) => new Date(item.starts_at) >= now);
  }, [visibleAgendaItems]);

  const adminStats = useMemo(() => {
    const suspicionCounts = suspects.map((suspect) => {
      const related = suspectStatuses.filter(
        (x) => x.suspect_id === suspect.id
      );
      return {
        suspect,
        suspectCount: related.filter((x) => x.status === "suspect").length,
        doubtCount: related.filter((x) => x.status === "doubt").length,
        excludedCount: related.filter((x) => x.status === "excluded").length,
        noteCount: suspectNotes.filter((x) => x.suspect_id === suspect.id)
          .length,
      };
    });

    const groupStats = groups.map((group) => ({
      group,
      cluesBought: groupClues.filter((x) => x.group_id === group.id).length,
      notifications: notifications.filter((x) => x.group_id === group.id)
        .length,
      transactions: transactions.filter((x) => x.group_id === group.id).length,
      notes: suspectNotes.filter((x) => x.group_id === group.id).length,
      statuses: suspectStatuses.filter((x) => x.group_id === group.id).length,
    }));

    return { suspicionCounts, groupStats };
  }, [
    groups,
    groupClues,
    notifications,
    transactions,
    suspects,
    suspectNotes,
    suspectStatuses,
  ]);

  const scheduleReload = (currentProfile = profile) => {
    if (!currentProfile) return;

    if (isTypingRef.current) {
      return;
    }

    if (reloadTimer.current) {
      clearTimeout(reloadTimer.current);
    }

    reloadTimer.current = setTimeout(() => {
      if (!isTypingRef.current) {
        loadAppData(currentProfile);
      }
    }, 1000);
  };

  const appFocusHandlers = {
    onFocusCapture: (e) => {
      const tag = e.target.tagName?.toLowerCase();

      if (["input", "textarea", "select"].includes(tag)) {
        isTypingRef.current = true;
      }
    },

    onBlurCapture: (e) => {
      const tag = e.target.tagName?.toLowerCase();

      if (["input", "textarea", "select"].includes(tag)) {
        setTimeout(() => {
          isTypingRef.current = false;
          loadAppData(profile);
        }, 500);
      }
    },
  };

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        setTimeout(() => {
          loadProfile(newSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        clearAppData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel("csi-hit-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups" },
        () => scheduleReload(profile)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_clues" },
        () => scheduleReload(profile)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => scheduleReload(profile)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_transactions" },
        () => scheduleReload(profile)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clues" },
        () => scheduleReload(profile)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agenda_items" },
        () => scheduleReload(profile)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suspect_notes" },
        () => scheduleReload(profile)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suspect_statuses" },
        () => scheduleReload(profile)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    if (!profile || profile.role !== "participant") return;
    if (!myGroup) return;

    const existingReport = finalReports.find(
      (report) => report.group_id === myGroup.id
    );

    if (!existingReport) return;

    setFinalReportSuspect(existingReport.suspect_id || "");
    setFinalReportMotive(existingReport.motive || "");
    setFinalReportEvidence(existingReport.evidence || "");
  }, [finalReports, myGroup?.id, profile]);

  useEffect(() => {
    if (!profile) return;
    if (profile.role === "admin" || profile.role === "suspect") return;
    if (!myGroup) return;

    const existingReport = finalReports.find(
      (report) => report.group_id === myGroup.id
    );

    const finaleIsRelevant =
      ENABLE_FINAL_REPORTS && (finalReportsOpen || Boolean(existingReport));

    if (activeParticipantTab === "final" && !finaleIsRelevant) {
      setActiveParticipantTab("dashboard");
    }
  }, [
    activeParticipantTab,
    finalReportsOpen,
    finalReports,
    myGroup?.id,
    profile?.role,
  ]);

  useEffect(() => {
    if (!ENABLE_FINAL_REPORTS && activeAdminTab === "final") {
      setActiveAdminTab("dashboard");
    }
  }, [activeAdminTab]);

  useEffect(() => {
    if (!profile || profile.role !== "suspect") return;
    if (!profile.suspect_id) return;

    setSelectedSuspectDossier((current) => current || profile.suspect_id);
  }, [profile?.id, profile?.role, profile?.suspect_id]);

  useEffect(() => {
    if (!profile || profile.role !== "participant") return;

    const firstActiveSuspect = suspects.find((suspect) => suspect.is_active);

    if (!selectedParticipantSuspect && firstActiveSuspect) {
      setSelectedParticipantSuspect(firstActiveSuspect.id);
    }

    if (
      selectedParticipantSuspect &&
      !suspects.some((suspect) => suspect.id === selectedParticipantSuspect)
    ) {
      setSelectedParticipantSuspect(firstActiveSuspect?.id || "");
    }
  }, [profile?.role, selectedParticipantSuspect, suspects]);

  const clearAppData = () => {
    setGroups([]);
    setProfiles([]);
    setMemberships([]);
    setSuspects([]);
    setAgendaItems([]);
    setNotifications([]);
    setTransactions([]);
    setClues([]);
    setClueCategories([]);
    setGroupClues([]);
    setSuspectNotes([]);
    setSuspectStatuses([]);
    setFinalReports([]);
    setLatestBackupInfo(null);
    setFinalReportsOpen(false);
  };

  const loadSession = async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setError(error.message);
      return;
    }

    setSession(data.session);

    if (data.session?.user) {
      await loadProfile(data.session.user.id);
    }
  };

  const loadProfile = async (userId) => {
    setError("");
    setMessage("");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setProfile(profileData);
    await loadAppData(profileData);
  };

  const loadAppData = async (currentProfile = profile) => {
    if (!currentProfile) return;

    const { data: agendaData } = await supabase
      .from("agenda_items")
      .select("*")
      .order("starts_at");

    const { data: suspectData } = await supabase
      .from("suspects")
      .select("*")
      .order("sort_order");

    const { data: cluesData } = await supabase
      .from("clues")
      .select("*, suspects(name)")
      .order("sort_order");

    const { data: clueCategoryData } = await supabase
      .from("clue_categories")
      .select("*")
      .order("sort_order");

    const { data: gameModeData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "game_mode")
      .maybeSingle();

    const { data: finalReportsOpenData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "final_reports_open")
      .maybeSingle();

    const { data: latestBackupData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "latest_auto_backup")
      .maybeSingle();

    setAgendaItems(agendaData || []);
    setSuspects(suspectData || []);
    setClues(cluesData || []);
    setClueCategories(clueCategoryData || []);
    setGameMode(gameModeData?.value || "test");
    setFinalReportsOpen(
      ENABLE_FINAL_REPORTS && finalReportsOpenData?.value === "true"
    );

    try {
      setLatestBackupInfo(
        latestBackupData?.value ? JSON.parse(latestBackupData.value) : null
      );
    } catch (_error) {
      setLatestBackupInfo(null);
    }

    if (currentProfile.role === "suspect") {
      const { data: groupsData } = await supabase
        .from("groups")
        .select("*")
        .order("created_at");

      const { data: groupClueData } = await supabase
        .from("group_clues")
        .select(
          "*, groups(name), clues(title, price, file_url, pdf_url, suspect_id)"
        );

      const { data: notesData } = await supabase
        .from("suspect_notes")
        .select("*, groups(name), suspects(name), profiles(display_name,email)")
        .order("created_at", { ascending: false });

      const { data: statusData } = await supabase
        .from("suspect_statuses")
        .select("*, groups(name), suspects(name)");

      setGroups(groupsData || []);
      setGroupClues(groupClueData || []);
      setSuspectNotes(notesData || []);
      setSuspectStatuses(statusData || []);
      setNotifications([]);
      setTransactions([]);
      return;
    }

    if (currentProfile.role === "admin") {
      const { data: groupsData } = await supabase
        .from("groups")
        .select("*")
        .order("created_at");

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("email");

      const { data: membershipData } = await supabase
        .from("group_members")
        .select("*");

      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*, groups(name)")
        .order("created_at", { ascending: false });

      const { data: transactionData } = await supabase
        .from("credit_transactions")
        .select("*, groups(name)")
        .order("created_at", { ascending: false });

      const { data: groupClueData } = await supabase
        .from("group_clues")
        .select(
          "*, groups(name), clues(title, price, file_url, pdf_url, suspect_id)"
        );

      const { data: notesData } = await supabase
        .from("suspect_notes")
        .select("*, groups(name), suspects(name), profiles(display_name,email)")
        .order("created_at", { ascending: false });

      const { data: statusData } = await supabase
        .from("suspect_statuses")
        .select("*, groups(name), suspects(name)");

      let finalReportsData = [];

      if (ENABLE_FINAL_REPORTS) {
        const { data, error: finalReportsError } = await supabase
          .from("final_reports")
          .select("*")
          .order("updated_at", { ascending: false });

        if (finalReportsError) {
          setError(`Eindrapporten laden mislukt: ${finalReportsError.message}`);
        }

        finalReportsData = data || [];
      }

      setGroups(groupsData || []);
      setProfiles(profilesData || []);
      setMemberships(membershipData || []);
      setNotifications(notificationsData || []);
      setTransactions(transactionData || []);
      setGroupClues(groupClueData || []);
      setSuspectNotes(notesData || []);
      setSuspectStatuses(statusData || []);
      setFinalReports(finalReportsData || []);
      return;
    }

    const { data: myMembershipsData, error: myMembershipsError } =
      await supabase
        .from("group_members")
        .select("*, groups(*)")
        .eq("user_id", currentProfile.id);

    if (myMembershipsError) {
      setError(myMembershipsError.message);
      return;
    }

    setMemberships(myMembershipsData || []);
    const myLoadedGroups = (myMembershipsData || [])
      .map((m) => m.groups)
      .filter(Boolean);
    setGroups(myLoadedGroups);

    const myGroupId = myMembershipsData?.[0]?.group_id;

    if (!myGroupId) {
      setNotifications([]);
      setTransactions([]);
      setGroupClues([]);
      setSuspectNotes([]);
      setSuspectStatuses([]);
      return;
    }

    const { data: notificationsData } = await supabase
      .from("notifications")
      .select("*")
      .eq("group_id", myGroupId)
      .order("created_at", { ascending: false });

    const { data: transactionData } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("group_id", myGroupId)
      .order("created_at", { ascending: false });

    const { data: groupClueData } = await supabase
      .from("group_clues")
      .select("*, clues(*)")
      .eq("group_id", myGroupId);

    const { data: notesData } = await supabase
      .from("suspect_notes")
      .select("*, groups(name), suspects(name), profiles(display_name,email)")
      .eq("group_id", myGroupId)
      .order("created_at", { ascending: false });

    const { data: statusData } = await supabase
      .from("suspect_statuses")
      .select("*, groups(name), suspects(name)")
      .eq("group_id", myGroupId);

    let finalReportsData = [];

    if (ENABLE_FINAL_REPORTS) {
      const { data } = await supabase
        .from("final_reports")
        .select("*, suspects(name)")
        .eq("group_id", myGroupId);

      finalReportsData = data || [];
    }

    setNotifications(notificationsData || []);
    setTransactions(transactionData || []);
    setGroupClues(groupClueData || []);
    setSuspectNotes(notesData || []);
    setSuspectStatuses(statusData || []);
    setFinalReports(finalReportsData || []);
  };

  const refreshWithLoading = async () => {
    if (!profile) return;

    setError("");
    setIsLoading(true);

    try {
      await loadAppData(profile);
    } catch (err) {
      setError(err?.message || "Er ging iets mis bij het verversen.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Vul e-mailadres en wachtwoord in.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email,
        },
      },
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Account aangemaakt.");
  };

  const handleLogin = async () => {
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Vul e-mailadres en wachtwoord in.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Ingelogd.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    clearAppData();
  };

  const uploadFileToBucket = async (bucket, folder, file) => {
    if (!file) return null;

    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const createGroup = async () => {
    setError("");
    setMessage("");

    if (!newGroupName.trim()) {
      setError("Vul een groepsnaam in.");
      return;
    }

    const { error } = await supabase.from("groups").insert({
      name: newGroupName.trim(),
      credits: 20,
      is_active: true,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setNewGroupName("");
    setMessage("Groep aangemaakt.");
    await loadAppData(profile);
  };
  const startEditGroup = (group) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name || "");
  };

  const saveEditGroup = async () => {
    setError("");
    setMessage("");

    if (!editingGroupId) {
      setError("Geen groep geselecteerd om te bewerken.");
      return;
    }

    if (!editGroupName.trim()) {
      setError("Vul een groepsnaam in.");
      return;
    }

    const { error } = await supabase
      .from("groups")
      .update({
        name: editGroupName.trim(),
      })
      .eq("id", editingGroupId);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingGroupId("");
    setEditGroupName("");
    setMessage("Groepsnaam bijgewerkt.");
    await loadAppData(profile);
  };

  const cancelEditGroup = () => {
    setEditingGroupId("");
    setEditGroupName("");
  };

  const addUserToGroup = async () => {
    setError("");
    setMessage("");

    if (!selectedUser || !selectedGroup) {
      setError("Selecteer een gebruiker en een groep.");
      return;
    }

    const { error } = await supabase.from("group_members").insert({
      user_id: selectedUser,
      group_id: selectedGroup,
    });

    if (error) {
      if (error.message?.includes("group_members_one_group_per_user")) {
        setError(
          "Deze gebruiker is al aan een groep gekoppeld. Verwijder eerst de bestaande koppeling of gebruik een ander account."
        );
        return;
      }

      setError(error.message);
      return;
    }

    setSelectedUser("");
    setSelectedGroup("");
    setMessage("Gebruiker gekoppeld aan groep.");
    await loadAppData(profile);
  };

  const linkUserToSuspect = async () => {
    setError("");
    setMessage("");

    if (!selectedSuspectUser || !selectedProfileSuspect) {
      setError("Selecteer een suspect-gebruiker en een verdachte.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        role: "suspect",
        suspect_id: selectedProfileSuspect,
      })
      .eq("id", selectedSuspectUser);

    if (error) {
      setError(error.message);
      return;
    }

    setSelectedSuspectUser("");
    setSelectedProfileSuspect("");
    setMessage("Suspect-account gekoppeld aan verdachte.");
    await loadAppData(profile);
  };

  const removeUserFromGroup = async (membership) => {
    setError("");
    setMessage("");

    const memberProfile = profiles.find((p) => p.id === membership.user_id);
    const group = groups.find((g) => g.id === membership.group_id);

    const ok = window.confirm(
      `Weet je zeker dat je ${
        memberProfile?.display_name || memberProfile?.email || "deze gebruiker"
      } uit groep "${group?.name || "onbekende groep"}" wilt verwijderen?`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("id", membership.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Gebruiker uit groep verwijderd.");
    await loadAppData(profile);
  };

  const createSuspect = async (file) => {
    setError("");
    setMessage("");

    if (!newSuspectName.trim()) {
      setError("Vul een naam voor de verdachte in.");
      return;
    }

    const uploadedUrl = await uploadFileToBucket(
      "suspect-photos",
      "suspects",
      file
    );

    const { error } = await supabase.from("suspects").insert({
      name: newSuspectName.trim(),
      description: newSuspectDescription.trim(),
      photo_url: uploadedUrl || newSuspectPhotoUrl.trim(),
      is_active: true,
      sort_order: suspects.length + 1,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setNewSuspectName("");
    setNewSuspectDescription("");
    setNewSuspectPhotoUrl("");
    setMessage("Verdachte toegevoegd.");
    await loadAppData(profile);
  };

  const startEditSuspect = (suspect) => {
    setEditingSuspectId(suspect.id);
    setEditSuspectName(suspect.name || "");
    setEditSuspectDescription(suspect.description || "");
    setEditSuspectPhotoUrl(suspect.photo_url || "");
  };

  const cancelEditSuspect = () => {
    setEditingSuspectId("");
    setEditSuspectName("");
    setEditSuspectDescription("");
    setEditSuspectPhotoUrl("");
  };

  const saveEditSuspect = async () => {
    setError("");
    setMessage("");

    if (!editingSuspectId) {
      setError("Geen verdachte geselecteerd om te bewerken.");
      return;
    }

    if (!editSuspectName.trim()) {
      setError("Vul een naam voor de verdachte in.");
      return;
    }

    const existingSuspect = suspects.find(
      (suspect) => suspect.id === editingSuspectId
    );

    const selectedFile = editSuspectFileRef.current?.files?.[0];

    let photoUrl =
      editSuspectPhotoUrl.trim() || existingSuspect?.photo_url || null;

    if (selectedFile) {
      const uploadedUrl = await uploadFileToBucket(
        "suspect-photos",
        "suspects",
        selectedFile
      );

      if (!uploadedUrl) {
        return;
      }

      photoUrl = uploadedUrl;
    }

    const { error } = await supabase
      .from("suspects")
      .update({
        name: editSuspectName.trim(),
        description: editSuspectDescription.trim(),
        photo_url: photoUrl,
      })
      .eq("id", editingSuspectId);

    if (error) {
      setError(error.message);
      return;
    }

    if (editSuspectFileRef.current) {
      editSuspectFileRef.current.value = "";
    }

    cancelEditSuspect();

    setMessage(
      selectedFile ? "Verdachte en foto bijgewerkt." : "Verdachte bijgewerkt."
    );

    await loadAppData(profile);
  };

  const createAgendaItem = async () => {
    setError("");
    setMessage("");

    if (!newAgenda.title.trim() || !newAgenda.starts_at) {
      setError("Vul minimaal een titel en starttijd in.");
      return;
    }

    const { error } = await supabase.from("agenda_items").insert({
      title: newAgenda.title.trim(),
      description: newAgenda.description.trim(),
      starts_at: new Date(newAgenda.starts_at).toISOString(),
      ends_at: newAgenda.ends_at
        ? new Date(newAgenda.ends_at).toISOString()
        : null,
      item_type: newAgenda.item_type,
      credits_reward: Number(newAgenda.credits_reward) || 0,
      is_visible: newAgenda.is_visible,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setNewAgenda({
      title: "",
      description: "",
      starts_at: "",
      ends_at: "",
      item_type: "activity",
      credits_reward: "0",
      is_visible: true,
    });

    setMessage("Agenda-item toegevoegd.");
    await loadAppData(profile);
  };

  const createClue = async (file) => {
    setError("");
    setMessage("");

    if (!newClueTitle.trim()) {
      setError("Vul een titel in.");
      return;
    }

    const fileUrl = await uploadFileToBucket("clue-files", "clues", file);

    const clueType = newClueIsFree
      ? "free"
      : newClueSuspect
      ? "suspect"
      : "general";

    const newCluePayload = {
      title: newClueTitle.trim(),
      description: newClueDescription.trim(),
      file_url: fileUrl,
      suspect_id: newClueSuspect || null,
      price: newClueIsFree ? 0 : Number(newCluePrice) || 0,
      clue_type: clueType,
      is_free: newClueIsFree,
      is_global: newClueIsGlobal,
      is_visible: true,
      sort_order: clues.length + 1,
    };

    if (clueCategories.length > 0) {
      newCluePayload.category_id = newClueCategory || null;
    }

    const { error } = await supabase.from("clues").insert(newCluePayload);

    if (error) {
      setError(error.message);
      return;
    }

    setNewClueTitle("");
    setNewClueDescription("");
    setNewCluePrice("5");
    setNewClueSuspect("");
    setNewClueCategory("");
    setNewClueIsFree(false);
    setNewClueIsGlobal(false);

    setMessage("Aanwijzing toegevoegd.");
    await loadAppData(profile);
  };
  const toggleSelectedManualClueGroup = (groupId) => {
    setSelectedManualClueGroups((current) => {
      if (current.includes(groupId)) {
        return current.filter((id) => id !== groupId);
      }

      return [...current, groupId];
    });
  };

  const toggleSelectedNotificationGroup = (groupId) => {
    setSelectedNotificationGroups((current) => {
      if (current.includes(groupId)) {
        return current.filter((id) => id !== groupId);
      }

      return [...current, groupId];
    });
  };

  const sendNotification = async () => {
    setError("");
    setMessage("");

    if (!newNotificationTitle.trim()) {
      setError("Vul een titel in.");
      return;
    }

    let targetGroupIds = [];

    if (notificationMode === "single") {
      if (!newNotificationGroup) {
        setError("Selecteer een groep.");
        return;
      }

      targetGroupIds = [newNotificationGroup];
    }

    if (notificationMode === "all") {
      targetGroupIds = groups
        .filter((group) => group.is_active)
        .map((group) => group.id);
    }

    if (notificationMode === "selection") {
      targetGroupIds = selectedNotificationGroups;
    }

    if (targetGroupIds.length === 0) {
      setError("Selecteer minimaal één groep om de melding naar te sturen.");
      return;
    }

    const rows = targetGroupIds.map((groupId) => ({
      group_id: groupId,
      title: newNotificationTitle.trim(),
      message: newNotificationMessage.trim(),
      notification_type:
        notificationMode === "all"
          ? "broadcast_all"
          : notificationMode === "selection"
          ? "broadcast_selection"
          : "manual",
      created_by: profile.id,
    }));

    const { error } = await supabase.from("notifications").insert(rows);

    if (error) {
      setError(error.message);
      return;
    }

    setNewNotificationGroup("");
    setSelectedNotificationGroups([]);
    setNewNotificationTitle("");
    setNewNotificationMessage("");

    setMessage(
      targetGroupIds.length === 1
        ? "Notificatie verstuurd."
        : `Notificatie verstuurd naar ${targetGroupIds.length} groepen.`
    );

    await loadAppData(profile);
  };

  const giveCredits = async () => {
    setError("");
    setMessage("");

    if (!creditGroup) {
      setError("Selecteer een groep.");
      return;
    }

    const amount = Number(creditAmount);

    const { error: adjustError } = await supabase.rpc("adjust_group_credits", {
      target_group_id: creditGroup,
      amount_change: amount,
    });

    if (adjustError) {
      setError(adjustError.message);
      return;
    }

    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        group_id: creditGroup,
        amount,
        reason: creditReason || "Handmatige wijziging",
        created_by: profile.id,
      });

    if (transactionError) {
      setError(transactionError.message);
      return;
    }

    await supabase.from("notifications").insert({
      group_id: creditGroup,
      title: amount >= 0 ? "Pegels ontvangen" : "Pegels afgeschreven",
      message:
        amount >= 0
          ? `Jullie hebben ${amount} pegels ontvangen.`
          : `${Math.abs(amount)} pegels afgeschreven.`,
      notification_type: "credits",
      created_by: profile.id,
    });

    setMessage("Pegels bijgewerkt.");
    await loadAppData(profile);
  };

  const changeCredits = async (groupId, amount, reason) => {
    setError("");
    setMessage("");

    if (!groupId) {
      setError("Selecteer een groep.");
      return;
    }

    const { error: adjustError } = await supabase.rpc("adjust_group_credits", {
      target_group_id: groupId,
      amount_change: amount,
    });

    if (adjustError) {
      setError(adjustError.message);
      return;
    }

    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        group_id: groupId,
        amount,
        reason,
        created_by: profile.id,
      });

    if (transactionError) {
      setError(transactionError.message);
      return;
    }

    await supabase.from("notifications").insert({
      group_id: groupId,
      title: amount >= 0 ? "Pegels ontvangen" : "Pegels afgeschreven",
      message:
        amount >= 0
          ? `Jullie hebben ${amount} pegels ontvangen.`
          : `${Math.abs(amount)} pegels afgeschreven.`,
      notification_type: "credits",
      created_by: profile.id,
    });

    setMessage("Pegels bijgewerkt.");
    await loadAppData(profile);
  };

  const toggleClueVisible = async (clue) => {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("clues")
      .update({ is_visible: !clue.is_visible })
      .eq("id", clue.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      clue.is_visible
        ? "Aanwijzing verborgen."
        : "Aanwijzing zichtbaar gemaakt."
    );
    await loadAppData(profile);
  };
  const startEditClue = (clue) => {
    setEditingClueId(clue.id);
    setEditClueTitle(clue.title || "");
    setEditClueDescription(clue.description || "");
    setEditCluePrice(String(clue.price ?? 0));
    setEditClueSuspect(clue.suspect_id || "");
    setEditClueCategory(clue.category_id || "");
    setEditClueIsFree(Boolean(clue.is_free));
    setEditClueIsGlobal(Boolean(clue.is_global));
    setEditClueIsVisible(Boolean(clue.is_visible));
  };

  const cancelEditClue = () => {
    setEditingClueId("");
    setEditClueTitle("");
    setEditClueDescription("");
    setEditCluePrice("0");
    setEditClueSuspect("");
    setEditClueCategory("");
    setEditClueIsFree(false);
    setEditClueIsGlobal(false);
    setEditClueIsVisible(true);
  };

  const saveEditClue = async () => {
    setError("");
    setMessage("");

    if (!editingClueId) {
      setError("Geen aanwijzing geselecteerd om te bewerken.");
      return;
    }

    if (!editClueTitle.trim()) {
      setError("Vul een titel in.");
      return;
    }

    const existingClue = clues.find((clue) => clue.id === editingClueId);
    const selectedFile = editClueFileRef.current?.files?.[0];

    let fileUrl = existingClue?.file_url || null;

    if (selectedFile) {
      const uploadedUrl = await uploadFileToBucket(
        "clue-files",
        "clues",
        selectedFile
      );

      if (!uploadedUrl) {
        return;
      }

      fileUrl = uploadedUrl;
    }

    const clueType = editClueIsFree
      ? "free"
      : editClueSuspect
      ? "suspect"
      : "general";

    const editCluePayload = {
      title: editClueTitle.trim(),
      description: editClueDescription.trim(),
      suspect_id: editClueSuspect || null,
      price: editClueIsFree ? 0 : Number(editCluePrice) || 0,
      clue_type: clueType,
      is_free: editClueIsFree,
      is_global: editClueIsGlobal,
      is_visible: editClueIsVisible,
      file_url: fileUrl,
    };

    if (clueCategories.length > 0) {
      editCluePayload.category_id = editClueCategory || null;
    }

    const { error } = await supabase
      .from("clues")
      .update(editCluePayload)
      .eq("id", editingClueId);

    if (error) {
      setError(error.message);
      return;
    }

    if (editClueFileRef.current) {
      editClueFileRef.current.value = "";
    }

    cancelEditClue();
    setMessage(
      selectedFile
        ? "Aanwijzing en bestand bijgewerkt."
        : "Aanwijzing bijgewerkt."
    );

    await loadAppData(profile);
  };
  const deleteClue = async (clue) => {
    setError("");
    setMessage("");

    const ok = window.confirm(
      `Weet je zeker dat je aanwijzing "${clue.title}" wilt verwijderen?`
    );

    if (!ok) return;

    const { error } = await supabase.from("clues").delete().eq("id", clue.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Aanwijzing verwijderd.");
    await loadAppData(profile);
  };

  const toggleAgendaVisible = async (item) => {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("agenda_items")
      .update({ is_visible: !item.is_visible })
      .eq("id", item.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      item.is_visible
        ? "Agenda-item verborgen."
        : "Agenda-item zichtbaar gemaakt."
    );
    await loadAppData(profile);
  };
  const startEditAgenda = (item) => {
    setEditingAgendaId(item.id);
    setEditAgenda({
      title: item.title || "",
      description: item.description || "",
      starts_at: toDateTimeLocalValue(item.starts_at),
      ends_at: toDateTimeLocalValue(item.ends_at),
      item_type: item.item_type || "activity",
      credits_reward: String(item.credits_reward ?? 0),
      is_visible: Boolean(item.is_visible),
    });
  };

  const cancelEditAgenda = () => {
    setEditingAgendaId("");
    setEditAgenda({
      title: "",
      description: "",
      starts_at: "",
      ends_at: "",
      item_type: "activity",
      credits_reward: "0",
      is_visible: true,
    });
  };

  const saveEditAgenda = async () => {
    setError("");
    setMessage("");

    if (!editingAgendaId) {
      setError("Geen agenda-item geselecteerd om te bewerken.");
      return;
    }

    if (!editAgenda.title.trim() || !editAgenda.starts_at) {
      setError("Vul minimaal een titel en starttijd in.");
      return;
    }

    const { error } = await supabase
      .from("agenda_items")
      .update({
        title: editAgenda.title.trim(),
        description: editAgenda.description.trim(),
        starts_at: new Date(editAgenda.starts_at).toISOString(),
        ends_at: editAgenda.ends_at
          ? new Date(editAgenda.ends_at).toISOString()
          : null,
        item_type: editAgenda.item_type,
        credits_reward: Number(editAgenda.credits_reward) || 0,
        is_visible: editAgenda.is_visible,
      })
      .eq("id", editingAgendaId);

    if (error) {
      setError(error.message);
      return;
    }

    cancelEditAgenda();
    setMessage("Agenda-item bijgewerkt.");
    await loadAppData(profile);
  };
  const deleteAgendaItem = async (item) => {
    setError("");
    setMessage("");

    const ok = window.confirm(
      `Weet je zeker dat je agenda-item "${item.title}" wilt verwijderen?`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("agenda_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Agenda-item verwijderd.");
    await loadAppData(profile);
  };
  const toggleSuspectActive = async (suspect) => {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("suspects")
      .update({ is_active: !suspect.is_active })
      .eq("id", suspect.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      suspect.is_active
        ? "Verdachte inactief gezet."
        : "Verdachte actief gezet."
    );

    await loadAppData(profile);
  };

  const toggleGroupActive = async (group) => {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("groups")
      .update({ is_active: !group.is_active })
      .eq("id", group.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      group.is_active ? "Groep inactief gezet." : "Groep actief gezet."
    );

    await loadAppData(profile);
  };
  const getGroupLastActivity = (groupId) => {
    const dates = [
      ...groupClues
        .filter((item) => item.group_id === groupId)
        .map((item) => item.purchased_at || item.created_at),
      ...suspectNotes
        .filter((item) => item.group_id === groupId)
        .map((item) => item.created_at),
      ...suspectStatuses
        .filter((item) => item.group_id === groupId)
        .map((item) => item.updated_at || item.created_at),
      ...notifications
        .filter((item) => item.group_id === groupId)
        .map((item) => item.created_at),
      ...transactions
        .filter((item) => item.group_id === groupId)
        .map((item) => item.created_at),
    ].filter(Boolean);

    if (dates.length === 0) return null;

    return dates.sort((a, b) => new Date(b) - new Date(a))[0];
  };

  const getGroupFinalReport = (groupId) => {
    return finalReports.find((report) => report.group_id === groupId);
  };

  const getParticipantProgress = () => {
    if (!myGroup) {
      return {
        unlockedCount: 0,
        buyableCount: 0,
        noteCount: 0,
        statusCount: 0,
        finalReport: null,
      };
    }

    const visibleClues = clues.filter((clue) => clue.is_visible);

    const unlockedCount = visibleClues.filter((clue) => {
      const purchased = purchasedClueIds.includes(clue.id);
      return clue.is_free || clue.is_global || purchased;
    }).length;

    const buyableCount = visibleClues.filter((clue) => {
      const purchased = purchasedClueIds.includes(clue.id);
      return !clue.is_free && !clue.is_global && !purchased;
    }).length;

    return {
      unlockedCount,
      buyableCount,
      noteCount: suspectNotes.length,
      statusCount: suspectStatuses.length,
      finalReport: ENABLE_FINAL_REPORTS
        ? finalReports.find((report) => report.group_id === myGroup.id)
        : null,
    };
  };

  const getClueCategoryName = (clue) => {
    const category = clueCategories.find(
      (item) => item.id === clue.category_id
    );

    if (category?.name) return category.name;
    if (clue.is_free) return "Gratis startinformatie";
    if (clue.is_global) return "Algemene aanwijzingen";
    if (clue.clue_type === "suspect") return "Verdachte aanwijzingen";
    if (clue.clue_type === "general") return "Algemene aanwijzingen";
    return "Overig";
  };

  const groupCluesByCategory = (items) => {
    const grouped = items.reduce((result, clue) => {
      const categoryName = getClueCategoryName(clue);
      const category = clueCategories.find(
        (item) => item.id === clue.category_id
      );
      const sortOrder = category?.sort_order ?? 9999;
      const key = category?.id || categoryName;

      if (!result[key]) {
        result[key] = {
          key,
          name: categoryName,
          sortOrder,
          clues: [],
        };
      }

      result[key].clues.push(clue);
      return result;
    }, {});

    return Object.values(grouped).sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
  };

  const createClueCategory = async () => {
    setError("");
    setMessage("");

    if (!newClueCategoryName.trim()) {
      setError("Vul een categorienaam in.");
      return;
    }

    const { error } = await supabase.from("clue_categories").insert({
      name: newClueCategoryName.trim(),
      sort_order: clueCategories.length + 1,
      is_active: true,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setNewClueCategoryName("");
    setMessage("Aanwijzingcategorie toegevoegd.");
    await loadAppData(profile);
  };

  const startEditClueCategory = (category) => {
    setEditingCategoryId(category.id);
    setEditClueCategoryName(category.name || "");
  };

  const cancelEditClueCategory = () => {
    setEditingCategoryId("");
    setEditClueCategoryName("");
  };

  const saveEditClueCategory = async () => {
    setError("");
    setMessage("");

    if (!editingCategoryId) {
      setError("Geen categorie geselecteerd om te bewerken.");
      return;
    }

    if (!editClueCategoryName.trim()) {
      setError("Vul een categorienaam in.");
      return;
    }

    const { error } = await supabase
      .from("clue_categories")
      .update({ name: editClueCategoryName.trim() })
      .eq("id", editingCategoryId);

    if (error) {
      setError(error.message);
      return;
    }

    cancelEditClueCategory();
    setMessage("Aanwijzingcategorie bijgewerkt.");
    await loadAppData(profile);
  };

  const toggleClueCategoryActive = async (category) => {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("clue_categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      category.is_active ? "Categorie verborgen." : "Categorie actief gemaakt."
    );
    await loadAppData(profile);
  };

  const shouldShowParticipantFinalTab = () => {
    if (!ENABLE_FINAL_REPORTS) return false;
    if (!myGroup) return false;

    const existingReport = finalReports.find(
      (report) => report.group_id === myGroup.id
    );

    return finalReportsOpen || Boolean(existingReport);
  };

  const assignClueToGroup = async () => {
    setError("");
    setMessage("");

    if (!manualClueId) {
      setError("Selecteer een aanwijzing.");
      return;
    }

    const selectedClue = clues.find((clue) => clue.id === manualClueId);

    let targetGroupIds = [];

    if (manualClueMode === "single") {
      if (!manualClueGroup) {
        setError("Selecteer een groep.");
        return;
      }

      targetGroupIds = [manualClueGroup];
    }

    if (manualClueMode === "all") {
      targetGroupIds = groups
        .filter((group) => group.is_active)
        .map((group) => group.id);
    }

    if (manualClueMode === "selection") {
      targetGroupIds = selectedManualClueGroups;
    }

    if (targetGroupIds.length === 0) {
      setError("Selecteer minimaal één groep.");
      return;
    }

    const alreadyAssignedGroupIds = groupClues
      .filter(
        (item) =>
          item.clue_id === manualClueId &&
          targetGroupIds.includes(item.group_id)
      )
      .map((item) => item.group_id);

    const newTargetGroupIds = targetGroupIds.filter(
      (groupId) => !alreadyAssignedGroupIds.includes(groupId)
    );

    if (newTargetGroupIds.length === 0) {
      setError("Alle geselecteerde groepen hebben deze aanwijzing al.");
      return;
    }

    const assignmentRows = newTargetGroupIds.map((groupId) => ({
      group_id: groupId,
      clue_id: manualClueId,
    }));

    const { error: assignmentError } = await supabase
      .from("group_clues")
      .insert(assignmentRows);

    if (assignmentError) {
      setError(assignmentError.message);
      return;
    }

    const notificationRows = newTargetGroupIds.map((groupId) => ({
      group_id: groupId,
      title: "Aanwijzing ontvangen",
      message: `Jullie hebben een aanwijzing ontvangen: ${
        selectedClue?.title || "Onbekende aanwijzing"
      }.`,
      notification_type:
        manualClueMode === "all"
          ? "clue_manual_all"
          : manualClueMode === "selection"
          ? "clue_manual_selection"
          : "clue_manual",
      created_by: profile.id,
    }));

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (notificationError) {
      setError(
        `Aanwijzing toegewezen, maar notificatie versturen mislukte: ${notificationError.message}`
      );
      await loadAppData(profile);
      return;
    }

    setManualClueGroup("");
    setManualClueId("");
    setSelectedManualClueGroups([]);

    setMessage(
      alreadyAssignedGroupIds.length > 0
        ? `Aanwijzing toegewezen aan ${newTargetGroupIds.length} groep(en). ${alreadyAssignedGroupIds.length} groep(en) hadden deze aanwijzing al.`
        : `Aanwijzing toegewezen aan ${newTargetGroupIds.length} groep(en).`
    );

    await loadAppData(profile);
  };
  const updateGameMode = async (newMode) => {
    setError("");
    setMessage("");

    if (profile?.role !== "admin") {
      setError("Alleen admin mag de spelmodus wijzigen.");
      return;
    }

    if (!["test", "live"].includes(newMode)) {
      setError("Ongeldige spelmodus.");
      return;
    }

    if (newMode === "live") {
      const confirmation = window.prompt(
        "Je zet het spel LIVE. Reset testdata wordt daarna geblokkeerd. Typ exact: LIVE"
      );

      if (confirmation !== "LIVE") {
        setError("Live zetten geannuleerd.");
        return;
      }
    }

    if (newMode === "test") {
      const confirmation = window.prompt(
        "Je zet het spel terug naar TESTMODUS. Typ exact: TEST"
      );

      if (confirmation !== "TEST") {
        setError("Terugzetten naar testmodus geannuleerd.");
        return;
      }
    }

    const { error } = await supabase.from("app_settings").upsert(
      {
        key: "game_mode",
        value: newMode,
        updated_at: new Date().toISOString(),
        updated_by: profile.id,
      },
      { onConflict: "key" }
    );

    if (error) {
      setError(error.message);
      return;
    }

    setGameMode(newMode);
    setMessage(
      newMode === "live"
        ? "Live spel is ingeschakeld."
        : "Testmodus is ingeschakeld."
    );

    await loadAppData(profile);
  };

  const updateFinalReportsOpen = async (open) => {
    setError("");
    setMessage("");

    if (profile?.role !== "admin") {
      setError("Alleen admin mag eindrapporten openen of sluiten.");
      return;
    }

    const confirmation = window.prompt(
      open
        ? "Je opent de eindrapporten voor deelnemers. Typ exact: OPEN"
        : "Je sluit de eindrapporten. Groepen kunnen daarna niet meer aanpassen. Typ exact: SLUIT"
    );

    if (open && confirmation !== "OPEN") {
      setError("Openen van eindrapporten geannuleerd.");
      return;
    }

    if (!open && confirmation !== "SLUIT") {
      setError("Sluiten van eindrapporten geannuleerd.");
      return;
    }

    const { error } = await supabase.from("app_settings").upsert(
      {
        key: "final_reports_open",
        value: open ? "true" : "false",
        updated_at: new Date().toISOString(),
        updated_by: profile.id,
      },
      { onConflict: "key" }
    );

    if (error) {
      setError(error.message);
      return;
    }

    setFinalReportsOpen(open);
    setMessage(
      open
        ? "Eindrapporten zijn geopend voor deelnemers."
        : "Eindrapporten zijn gesloten."
    );

    await loadAppData(profile);
  };
  const createLiveBackup = async () => {
    setError("");
    setMessage("");

    if (profile?.role !== "admin") {
      setError("Alleen admin mag een backup starten.");
      return;
    }

    if (gameMode !== "live") {
      setError("LIVE-backup is uitgeschakeld in testmodus.");
      return;
    }

    const confirmation = window.prompt(
      "Je maakt nu een handmatige LIVE-backup in Supabase Storage. Typ exact: BACKUP"
    );

    if (confirmation !== "BACKUP") {
      setError("Backup geannuleerd.");
      return;
    }

    setIsBackupRunning(true);

    const { data, error } = await supabase.functions.invoke(
      "csi-hit-nightly-backup",
      {
        body: { source: "manual", requested_by: profile.id },
      }
    );

    setIsBackupRunning(false);

    if (error) {
      setError(error.message || "Backup maken mislukt.");
      return;
    }

    if (data?.skipped) {
      setMessage(data.message || "Backup overgeslagen.");
      await loadAppData(profile);
      return;
    }

    setMessage("LIVE-backup opgeslagen in Supabase Storage.");
    await loadAppData(profile);
  };

  const safeCsvValue = (value) => {
    if (value === null || value === undefined) return "";

    const stringValue = String(value).replaceAll('"', '""');
    return `"${stringValue}"`;
  };

  const downloadTextFile = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const buildCsvContent = (headers, rows) => {
    return [
      headers.map(safeCsvValue).join(";"),
      ...rows.map((row) =>
        headers.map((header) => safeCsvValue(row[header])).join(";")
      ),
    ].join("\n");
  };

  const downloadCsv = (filename, headers, rows) => {
    const csv = buildCsvContent(headers, rows);
    downloadTextFile(filename, csv, "text/csv;charset=utf-8;");
  };

  const getExportStamp = () => {
    return new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  };

  const exportFullBackup = () => {
    const backup = {
      exported_at: new Date().toISOString(),
      game_mode: gameMode,
      final_reports_open: finalReportsOpen,
      groups,
      profiles,
      memberships,
      suspects,
      agenda_items: agendaItems,
      clues,
      clue_categories: clueCategories,
      group_clues: groupClues,
      suspect_notes: suspectNotes,
      suspect_statuses: suspectStatuses,
      final_reports: finalReports,
      notifications,
      credit_transactions: transactions,
    };

    downloadTextFile(
      `csi-hit-backup-${getExportStamp()}.json`,
      JSON.stringify(backup, null, 2),
      "application/json;charset=utf-8;"
    );
  };

  const exportNotesCsv = () => {
    const headers = [
      "created_at",
      "group_name",
      "suspect_name",
      "author",
      "note",
    ];

    const rows = suspectNotes.map((note) => ({
      created_at: note.created_at || "",
      group_name:
        note.groups?.name ||
        groups.find((group) => group.id === note.group_id)?.name ||
        "",
      suspect_name:
        note.suspects?.name ||
        suspects.find((suspect) => suspect.id === note.suspect_id)?.name ||
        "",
      author:
        note.profiles?.display_name ||
        note.profiles?.email ||
        note.user_id ||
        "",
      note: note.note || "",
    }));

    downloadCsv(`csi-hit-notities-${getExportStamp()}.csv`, headers, rows);
  };

  const exportStatusesCsv = () => {
    const headers = ["updated_at", "group_name", "suspect_name", "status"];

    const rows = suspectStatuses.map((status) => ({
      updated_at: status.updated_at || status.created_at || "",
      group_name:
        status.groups?.name ||
        groups.find((group) => group.id === status.group_id)?.name ||
        "",
      suspect_name:
        status.suspects?.name ||
        suspects.find((suspect) => suspect.id === status.suspect_id)?.name ||
        "",
      status: getStatusLabel(status.status),
    }));

    downloadCsv(`csi-hit-statussen-${getExportStamp()}.csv`, headers, rows);
  };

  const exportPurchasesCsv = () => {
    const headers = [
      "moment",
      "status",
      "source",
      "group_name",
      "clue_title",
      "suspect_name",
      "price",
      "file_url",
    ];

    const rows = groupClues.map((purchase) => {
      const clue =
        purchase.clues || clues.find((item) => item.id === purchase.clue_id);

      const suspect =
        suspects.find((item) => item.id === clue?.suspect_id) || clue?.suspects;

      return {
        moment:
          purchase.released_at ||
          purchase.requested_at ||
          purchase.purchased_at ||
          purchase.created_at ||
          "",
        status: purchase.status || "",
        source: purchase.source || "",
        group_name:
          purchase.groups?.name ||
          groups.find((group) => group.id === purchase.group_id)?.name ||
          "",
        clue_title: clue?.title || "",
        suspect_name: suspect?.name || "Algemeen",
        price: clue?.price ?? "",
        file_url: clue?.file_url || clue?.pdf_url || "",
      };
    });

    downloadCsv(`csi-hit-aankopen-${getExportStamp()}.csv`, headers, rows);
  };

  const exportTransactionsCsv = () => {
    const headers = ["created_at", "group_name", "amount", "reason"];

    const rows = transactions.map((transaction) => ({
      created_at: transaction.created_at || "",
      group_name:
        transaction.groups?.name ||
        groups.find((group) => group.id === transaction.group_id)?.name ||
        "",
      amount: transaction.amount ?? "",
      reason: transaction.reason || "",
    }));

    downloadCsv(`csi-hit-pegels-${getExportStamp()}.csv`, headers, rows);
  };
  const exportFinalReportsCsv = () => {
    const headers = [
      "submitted_at",
      "updated_at",
      "group_name",
      "suspect_name",
      "motive",
      "evidence",
      "submitted_by",
    ];

    const rows = finalReports.map((report) => ({
      submitted_at: report.submitted_at || "",
      updated_at: report.updated_at || "",
      group_name:
        report.groups?.name ||
        groups.find((group) => group.id === report.group_id)?.name ||
        "",
      suspect_name:
        report.suspects?.name ||
        suspects.find((suspect) => suspect.id === report.suspect_id)?.name ||
        "",
      motive: report.motive || "",
      evidence: report.evidence || "",
      submitted_by: report.submitted_by || "",
    }));

    downloadCsv(`csi-hit-eindrapporten-${getExportStamp()}.csv`, headers, rows);
  };

  const exportCompleteCsvBackup = () => {
    const stamp = getExportStamp();

    const groupRows = groups.map((group) => ({
      name: group.name || "",
      credits: group.credits ?? "",
      is_active: group.is_active ? "ja" : "nee",
      created_at: group.created_at || "",
    }));

    const suspectRows = suspects.map((suspect) => ({
      name: suspect.name || "",
      active: suspect.active ? "ja" : "nee",
      description: suspect.description || "",
      photo_url: suspect.photo_url || "",
      created_at: suspect.created_at || "",
    }));

    const clueRows = clues.map((clue) => ({
      title: clue.title || "",
      suspect_name:
        clue.suspects?.name ||
        suspects.find((suspect) => suspect.id === clue.suspect_id)?.name ||
        "Algemeen",
      price: clue.price ?? "",
      clue_type: clue.clue_type || "",
      category: getClueCategoryName(clue),
      description: clue.description || "",
      file_url: clue.file_url || clue.pdf_url || "",
      is_visible: clue.is_visible ? "ja" : "nee",
      created_at: clue.created_at || "",
    }));

    const purchaseRows = groupClues.map((purchase) => {
      const clue =
        purchase.clues || clues.find((item) => item.id === purchase.clue_id);

      const suspect =
        suspects.find((item) => item.id === clue?.suspect_id) || clue?.suspects;

      return {
        moment:
          purchase.released_at ||
          purchase.requested_at ||
          purchase.purchased_at ||
          purchase.created_at ||
          "",
        status: purchase.status || "",
        source: purchase.source || "",
        group_name:
          purchase.groups?.name ||
          groups.find((group) => group.id === purchase.group_id)?.name ||
          "",
        clue_title: clue?.title || "",
        suspect_name: suspect?.name || "Algemeen",
        price: clue?.price ?? "",
        file_url: clue?.file_url || clue?.pdf_url || "",
      };
    });

    const noteRows = suspectNotes.map((note) => ({
      created_at: note.created_at || "",
      group_name:
        note.groups?.name ||
        groups.find((group) => group.id === note.group_id)?.name ||
        "",
      suspect_name:
        note.suspects?.name ||
        suspects.find((suspect) => suspect.id === note.suspect_id)?.name ||
        "",
      author:
        note.profiles?.display_name ||
        note.profiles?.email ||
        note.user_id ||
        "",
      note: note.note || "",
    }));

    const statusRows = suspectStatuses.map((status) => ({
      updated_at: status.updated_at || status.created_at || "",
      group_name:
        status.groups?.name ||
        groups.find((group) => group.id === status.group_id)?.name ||
        "",
      suspect_name:
        status.suspects?.name ||
        suspects.find((suspect) => suspect.id === status.suspect_id)?.name ||
        "",
      status: getStatusLabel(status.status),
    }));

    const transactionRows = transactions.map((transaction) => ({
      created_at: transaction.created_at || "",
      group_name:
        transaction.groups?.name ||
        groups.find((group) => group.id === transaction.group_id)?.name ||
        "",
      amount: transaction.amount ?? "",
      reason: transaction.reason || "",
    }));

    const notificationRows = notifications.map((notification) => ({
      created_at: notification.created_at || "",
      group_name:
        notification.groups?.name ||
        groups.find((group) => group.id === notification.group_id)?.name ||
        "",
      title: notification.title || "",
      message: notification.message || "",
      is_read: notification.is_read ? "ja" : "nee",
    }));

    const agendaRows = agendaItems.map((item) => ({
      starts_at: item.starts_at || "",
      title: item.title || "",
      location: item.location || "",
      description: item.description || "",
      credits_reward: item.credits_reward ?? "",
    }));

    const finalReportRows = finalReports.map((report) => ({
      submitted_at: report.submitted_at || "",
      updated_at: report.updated_at || "",
      group_name:
        report.groups?.name ||
        groups.find((group) => group.id === report.group_id)?.name ||
        "",
      suspect_name:
        report.suspects?.name ||
        suspects.find((suspect) => suspect.id === report.suspect_id)?.name ||
        "",
      motive: report.motive || "",
      evidence: report.evidence || "",
      submitted_by: report.submitted_by || "",
    }));

    const exports = [
      {
        filename: `01_groepen-${stamp}.csv`,
        headers: ["name", "credits", "is_active", "created_at"],
        rows: groupRows,
      },
      {
        filename: `02_verdachten-${stamp}.csv`,
        headers: ["name", "active", "description", "photo_url", "created_at"],
        rows: suspectRows,
      },
      {
        filename: `03_aanwijzingen-${stamp}.csv`,
        headers: [
          "title",
          "suspect_name",
          "price",
          "clue_type",
          "category",
          "description",
          "file_url",
          "is_visible",
          "created_at",
        ],
        rows: clueRows,
      },
      {
        filename: `04_aankopen-${stamp}.csv`,
        headers: [
          "moment",
          "status",
          "source",
          "group_name",
          "clue_title",
          "suspect_name",
          "price",
          "file_url",
        ],
        rows: purchaseRows,
      },
      {
        filename: `05_notities-${stamp}.csv`,
        headers: ["created_at", "group_name", "suspect_name", "author", "note"],
        rows: noteRows,
      },
      {
        filename: `06_statussen-${stamp}.csv`,
        headers: ["updated_at", "group_name", "suspect_name", "status"],
        rows: statusRows,
      },
      {
        filename: `07_pegels-${stamp}.csv`,
        headers: ["created_at", "group_name", "amount", "reason"],
        rows: transactionRows,
      },
      {
        filename: `08_meldingen-${stamp}.csv`,
        headers: ["created_at", "group_name", "title", "message", "is_read"],
        rows: notificationRows,
      },
      {
        filename: `09_agenda-${stamp}.csv`,
        headers: [
          "starts_at",
          "title",
          "location",
          "description",
          "credits_reward",
        ],
        rows: agendaRows,
      },
      {
        filename: `10_eindrapporten-${stamp}.csv`,
        headers: [
          "submitted_at",
          "updated_at",
          "group_name",
          "suspect_name",
          "motive",
          "evidence",
          "submitted_by",
        ],
        rows: finalReportRows,
      },
    ];

    exports.forEach((exportFile, index) => {
      window.setTimeout(() => {
        downloadCsv(
          `csi-hit-${exportFile.filename}`,
          exportFile.headers,
          exportFile.rows
        );
      }, index * 250);
    });

    setMessage(
      `Volledige CSV-backup gestart: ${exports.length} bestanden worden gedownload.`
    );
  };

  const resetTestData = async () => {
    setError("");
    setMessage("");

    if (gameMode !== "test") {
      setError("Reset testdata is geblokkeerd omdat het spel live staat.");
      return;
    }

    const confirmation = window.prompt(
      "Weet je zeker dat je alle testdata wilt resetten? Typ exact: RESET TESTDATA"
    );

    if (confirmation !== "RESET TESTDATA") {
      setError("Reset geannuleerd. De bevestigingstekst klopte niet.");
      return;
    }

    const { data, error } = await supabase.rpc("reset_test_data");

    if (error) {
      setError(error.message);
      return;
    }

    setGroupClues([]);
    setSuspectNotes([]);
    setSuspectStatuses([]);
    setFinalReports([]);
    setNotifications([]);
    setTransactions([]);

    setMessage(
      `Testdata gereset. Verwijderd: ${
        data?.deleted_group_clues || 0
      } aankopen, ${data?.deleted_notes || 0} notities, ${
        data?.deleted_statuses || 0
      } statussen, ${data?.deleted_final_reports || 0} eindrapporten, ${
        data?.deleted_notifications || 0
      } meldingen en ${data?.deleted_transactions || 0} transacties.`
    );

    await loadAppData(profile);
  };
  const removeGroupClue = async (purchase) => {
    setError("");
    setMessage("");

    if (gameMode !== "test") {
      setError(
        "Aanwijzingen verwijderen bij een groep is geblokkeerd omdat het spel live staat."
      );
      return;
    }

    const clueTitle =
      purchase.clues?.title ||
      clues.find((clue) => clue.id === purchase.clue_id)?.title ||
      "deze aanwijzing";

    const ok = window.confirm(
      `Weet je zeker dat je "${clueTitle}" wilt verwijderen bij deze groep?`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("group_clues")
      .delete()
      .eq("id", purchase.id);

    if (error) {
      setError(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      group_id: purchase.group_id,
      title: "Aanwijzing gecorrigeerd",
      message: `De aanwijzing "${clueTitle}" is door de organisatie verwijderd.`,
      notification_type: "clue_removed",
      created_by: profile.id,
    });

    setMessage("Gekochte/toegewezen aanwijzing verwijderd bij groep.");
    await loadAppData(profile);
  };

  const deleteDemoData = async ({ silent = false } = {}) => {
    setError("");
    if (!silent) setMessage("");

    if (profile?.role !== "admin") {
      setError("Alleen admin mag demo-data verwijderen.");
      return false;
    }

    if (gameMode !== "test") {
      setError(
        "Demo-data verwijderen is geblokkeerd omdat het spel live staat."
      );
      return false;
    }

    if (!silent) {
      const confirmation = window.prompt(
        "Je verwijdert alleen demo-data met prefix DEMO -. Typ exact: VERWIJDER DEMO"
      );

      if (confirmation !== "VERWIJDER DEMO") {
        setError("Demo-data verwijderen geannuleerd.");
        return false;
      }
    }

    const { data: demoGroups, error: groupLookupError } = await supabase
      .from("groups")
      .select("id")
      .like("name", "DEMO -%");

    if (groupLookupError) {
      setError(groupLookupError.message);
      return false;
    }

    const { data: demoSuspects, error: suspectLookupError } = await supabase
      .from("suspects")
      .select("id")
      .like("name", "DEMO -%");

    if (suspectLookupError) {
      setError(suspectLookupError.message);
      return false;
    }

    const { data: demoClues, error: clueLookupError } = await supabase
      .from("clues")
      .select("id")
      .like("title", "DEMO -%");

    if (clueLookupError) {
      setError(clueLookupError.message);
      return false;
    }

    const demoGroupIds = (demoGroups || []).map((item) => item.id);
    const demoSuspectIds = (demoSuspects || []).map((item) => item.id);
    const demoClueIds = (demoClues || []).map((item) => item.id);

    if (demoGroupIds.length > 0) {
      await supabase.from("group_clues").delete().in("group_id", demoGroupIds);
      await supabase
        .from("suspect_notes")
        .delete()
        .in("group_id", demoGroupIds);
      await supabase
        .from("suspect_statuses")
        .delete()
        .in("group_id", demoGroupIds);
      await supabase
        .from("notifications")
        .delete()
        .in("group_id", demoGroupIds);
      await supabase
        .from("credit_transactions")
        .delete()
        .in("group_id", demoGroupIds);
      await supabase
        .from("final_reports")
        .delete()
        .in("group_id", demoGroupIds);
    }

    if (demoClueIds.length > 0) {
      await supabase.from("group_clues").delete().in("clue_id", demoClueIds);
      await supabase.from("clues").delete().in("id", demoClueIds);
    }

    if (demoSuspectIds.length > 0) {
      await supabase
        .from("suspect_notes")
        .delete()
        .in("suspect_id", demoSuspectIds);
      await supabase
        .from("suspect_statuses")
        .delete()
        .in("suspect_id", demoSuspectIds);
      await supabase
        .from("final_reports")
        .delete()
        .in("suspect_id", demoSuspectIds);
      await supabase.from("clues").delete().in("suspect_id", demoSuspectIds);
      await supabase.from("suspects").delete().in("id", demoSuspectIds);
    }

    if (demoGroupIds.length > 0) {
      await supabase.from("groups").delete().in("id", demoGroupIds);
    }

    if (!silent) {
      setMessage("Demo-data verwijderd.");
      await loadAppData(profile);
    }

    return true;
  };

  const loadDemoData = async () => {
    setError("");
    setMessage("");

    if (profile?.role !== "admin") {
      setError("Alleen admin mag demo-data laden.");
      return;
    }

    if (gameMode !== "test") {
      setError("Demo-data laden is geblokkeerd omdat het spel live staat.");
      return;
    }

    const confirmation = window.prompt(
      "Je laadt een gevulde demo-set. Bestaande demo-data met prefix DEMO - wordt eerst vervangen. Typ exact: LAAD DEMO"
    );

    if (confirmation !== "LAAD DEMO") {
      setError("Demo-data laden geannuleerd.");
      return;
    }

    const cleaned = await deleteDemoData({ silent: true });
    if (!cleaned) return;

    const demoGroupsToCreate = [
      { name: "DEMO - Team Zaklamp", credits: 18, is_active: true },
      { name: "DEMO - Team Bloedspoor", credits: 11, is_active: true },
      { name: "DEMO - Team Alibi", credits: 24, is_active: true },
      { name: "DEMO - Team Campingwacht", credits: 7, is_active: true },
    ];

    const { data: createdGroups, error: groupError } = await supabase
      .from("groups")
      .insert(demoGroupsToCreate)
      .select("*");

    if (groupError) {
      setError(groupError.message);
      return;
    }

    const demoSuspectsToCreate = [
      {
        name: "DEMO - Ferrie Bouwer",
        description:
          "Ferrie is handig, snel aangebrand en altijd net iets te toevallig in de buurt van problemen.",
        is_active: true,
        sort_order: 901,
      },
      {
        name: "DEMO - Presilla De Paal-Kluivert",
        description:
          "Presilla kent de camping beter dan ze toegeeft en lijkt opvallend rustig onder druk.",
        is_active: true,
        sort_order: 902,
      },
      {
        name: "DEMO - Wesley De Paal",
        description:
          "Wesley heeft een rommelig alibi en wordt door meerdere teams genoemd in hun eerste theorie.",
        is_active: true,
        sort_order: 903,
      },
      {
        name: "DEMO - Nancey van der Snek",
        description:
          "Nancey hoort veel, ziet veel en vergeet zelden iets. Behalve wanneer het haar goed uitkomt.",
        is_active: true,
        sort_order: 904,
      },
      {
        name: "DEMO - Ssjonn Meijenzorgh",
        description:
          "Ssjonn bewaakt de campingregels, maar sommige regels lijken voor hem optioneel.",
        is_active: true,
        sort_order: 905,
      },
      {
        name: "DEMO - Mitch Kolder",
        description:
          "Mitch is technisch handig en had toegang tot plekken waar deelnemers liever niet komen.",
        is_active: true,
        sort_order: 906,
      },
    ];

    const { data: createdSuspects, error: suspectError } = await supabase
      .from("suspects")
      .insert(demoSuspectsToCreate)
      .select("*");

    if (suspectError) {
      setError(suspectError.message);
      return;
    }

    const suspectByName = Object.fromEntries(
      (createdSuspects || []).map((suspect) => [suspect.name, suspect])
    );

    const demoCluesToCreate = [
      {
        title: "DEMO - Bloedspoor bij sanitairgebouw",
        description:
          "Een donker spoor loopt richting de achterzijde van het sanitairgebouw. Niet iedereen kon daar zomaar komen.",
        price: 5,
        suspect_id: suspectByName["DEMO - Ferrie Bouwer"]?.id || null,
        clue_type: "suspect",
        is_free: false,
        is_global: false,
        is_visible: true,
        sort_order: 901,
      },
      {
        title: "DEMO - Appbericht om 22:14",
        description:
          "Een appbericht noemt een afspraak bij de kampvuurplek, kort voor het incident.",
        price: 4,
        suspect_id:
          suspectByName["DEMO - Presilla De Paal-Kluivert"]?.id || null,
        clue_type: "suspect",
        is_free: false,
        is_global: false,
        is_visible: true,
        sort_order: 902,
      },
      {
        title: "DEMO - Getuige bij de slagboom",
        description:
          "Een getuige zag iemand gehaast richting de slagboom lopen, maar herkent alleen de jas.",
        price: 3,
        suspect_id: suspectByName["DEMO - Wesley De Paal"]?.id || null,
        clue_type: "suspect",
        is_free: false,
        is_global: false,
        is_visible: true,
        sort_order: 903,
      },
      {
        title: "DEMO - Gratis startaanwijzing",
        description:
          "Het slachtoffer is voor het laatst gezien bij de campingbar. Meerdere verklaringen spreken elkaar tegen.",
        price: 0,
        suspect_id: null,
        clue_type: "free",
        is_free: true,
        is_global: true,
        is_visible: true,
        sort_order: 904,
      },
      {
        title: "DEMO - Sleutelbos gevonden",
        description:
          "Een sleutelbos met een rood label is gevonden achter de recreatieruimte.",
        price: 6,
        suspect_id: suspectByName["DEMO - Nancey van der Snek"]?.id || null,
        clue_type: "suspect",
        is_free: false,
        is_global: false,
        is_visible: true,
        sort_order: 905,
      },
      {
        title: "DEMO - Camerabeeld receptie",
        description:
          "Het beeld hapert precies tijdens het belangrijkste kwartier. Toeval ruikt anders.",
        price: 7,
        suspect_id: suspectByName["DEMO - Mitch Kolder"]?.id || null,
        clue_type: "suspect",
        is_free: false,
        is_global: false,
        is_visible: true,
        sort_order: 906,
      },
      {
        title: "DEMO - Campingrooster aangepast",
        description:
          "Het dienstrooster is later aangepast. Wie daar toegang toe had, staat in het systeemlog.",
        price: 5,
        suspect_id: suspectByName["DEMO - Ssjonn Meijenzorgh"]?.id || null,
        clue_type: "suspect",
        is_free: false,
        is_global: false,
        is_visible: true,
        sort_order: 907,
      },
      {
        title: "DEMO - Bonnetje campingwinkel",
        description:
          "Op het bonnetje staan tie-wraps, batterijen en een energiedrank. Een verdacht boodschappenmandje.",
        price: 4,
        suspect_id: null,
        clue_type: "general",
        is_free: false,
        is_global: false,
        is_visible: true,
        sort_order: 908,
      },
    ];

    const { data: createdClues, error: clueError } = await supabase
      .from("clues")
      .insert(demoCluesToCreate)
      .select("*");

    if (clueError) {
      setError(clueError.message);
      return;
    }

    const activeDemoGroups = createdGroups || [];
    const activeDemoSuspects = createdSuspects || [];
    const activeDemoClues = createdClues || [];

    const purchases = [
      [0, 0],
      [0, 3],
      [0, 4],
      [1, 1],
      [1, 2],
      [1, 7],
      [2, 0],
      [2, 5],
      [2, 6],
      [3, 2],
      [3, 3],
    ]
      .filter(
        ([groupIndex, clueIndex]) =>
          activeDemoGroups[groupIndex] && activeDemoClues[clueIndex]
      )
      .map(([groupIndex, clueIndex]) => ({
        group_id: activeDemoGroups[groupIndex].id,
        clue_id: activeDemoClues[clueIndex].id,
      }));

    if (purchases.length > 0) {
      const { error: purchaseError } = await supabase
        .from("group_clues")
        .insert(purchases);

      if (purchaseError) {
        setError(purchaseError.message);
        return;
      }
    }

    const statuses = [
      [0, 2, "suspect"],
      [0, 0, "doubt"],
      [0, 1, "excluded"],
      [1, 1, "suspect"],
      [1, 2, "doubt"],
      [1, 5, "excluded"],
      [2, 0, "suspect"],
      [2, 4, "suspect"],
      [2, 2, "excluded"],
      [3, 2, "suspect"],
      [3, 3, "doubt"],
    ]
      .filter(
        ([groupIndex, suspectIndex]) =>
          activeDemoGroups[groupIndex] && activeDemoSuspects[suspectIndex]
      )
      .map(([groupIndex, suspectIndex, status]) => ({
        group_id: activeDemoGroups[groupIndex].id,
        suspect_id: activeDemoSuspects[suspectIndex].id,
        status,
        updated_at: new Date().toISOString(),
      }));

    if (statuses.length > 0) {
      const { error: statusError } = await supabase
        .from("suspect_statuses")
        .insert(statuses);

      if (statusError) {
        setError(statusError.message);
        return;
      }
    }

    const demoNotes = [
      [
        0,
        2,
        "Wesley reageerde te snel toen we vroegen naar de slagboom. Alsof hij het antwoord had ingestudeerd.",
      ],
      [
        0,
        0,
        "Ferrie zegt dat hij gereedschap zocht, maar niemand heeft hem bij de opslag gezien.",
      ],
      [
        1,
        1,
        "Presilla blijft opvallend rustig. Misschien omdat ze meer weet dan ze laat merken.",
      ],
      [1, 2, "Wesley heeft geen sluitend alibi tussen 22:00 en 22:30."],
      [
        2,
        0,
        "Ferrie had modder aan zijn schoenen die lijkt op de plek bij het sanitairgebouw.",
      ],
      [2, 4, "Ssjonn had toegang tot het rooster en de sleutels."],
      [
        3,
        2,
        "Team denkt dat Wesley afleidingsmanoeuvre speelde, maar bewijs is nog dun.",
      ],
      [3, 3, "Nancey hoorde ruzie, maar zegt niet tussen wie. Dat is vreemd."],
    ]
      .filter(
        ([groupIndex, suspectIndex]) =>
          activeDemoGroups[groupIndex] && activeDemoSuspects[suspectIndex]
      )
      .map(([groupIndex, suspectIndex, note]) => ({
        group_id: activeDemoGroups[groupIndex].id,
        suspect_id: activeDemoSuspects[suspectIndex].id,
        user_id: profile.id,
        note,
      }));

    if (demoNotes.length > 0) {
      const { error: noteError } = await supabase
        .from("suspect_notes")
        .insert(demoNotes);

      if (noteError) {
        setError(noteError.message);
        return;
      }
    }

    const notificationRows = activeDemoGroups.map((group, index) => ({
      group_id: group.id,
      title: "DEMO - Nieuwe wending in het onderzoek",
      message:
        index % 2 === 0
          ? "Er is een nieuwe aanwijzing beschikbaar. Controleer jullie theorie voordat je pegels uitgeeft."
          : "De organisatie heeft een tip ontvangen. Niet alles is wat het lijkt op Camping Meijenzorgh.",
      notification_type: "demo_broadcast",
      created_by: profile.id,
    }));

    if (notificationRows.length > 0) {
      await supabase.from("notifications").insert(notificationRows);
    }

    const transactionRows = activeDemoGroups.map((group, index) => ({
      group_id: group.id,
      amount: [5, -4, 8, -3][index] || 1,
      reason:
        index % 2 === 0
          ? "DEMO - Pegels verdiend met opdracht"
          : "DEMO - Aanwijzing gekocht",
      created_by: profile.id,
    }));

    if (transactionRows.length > 0) {
      await supabase.from("credit_transactions").insert(transactionRows);
    }

    setMessage(
      `Demo-data geladen: ${activeDemoGroups.length} groepen, ${activeDemoSuspects.length} verdachten en ${activeDemoClues.length} aanwijzingen.`
    );

    await loadAppData(profile);
  };
  const purchaseClue = async (clueId) => {
    setError("");
    setMessage("");

    if (!myGroup) {
      setError("Je bent nog niet aan een groep gekoppeld.");
      return;
    }

    const { error } = await supabase.rpc("purchase_clue", {
      target_group_id: myGroup.id,
      target_clue_id: clueId,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Aanwijzing gekocht.");
    await loadAppData(profile);
  };

  const addParticipantNote = async () => {
    setError("");
    setMessage("");

    if (!myGroup) {
      setError("Je bent nog niet aan een groep gekoppeld.");
      return;
    }

    if (!selectedNoteSuspect || !newNote.trim()) {
      setError("Kies een verdachte en vul een notitie in.");
      return;
    }

    const { error } = await supabase.from("suspect_notes").insert({
      group_id: myGroup.id,
      suspect_id: selectedNoteSuspect,
      user_id: profile.id,
      note: newNote.trim(),
    });

    if (error) {
      setError(error.message);
      return;
    }

    setSelectedNoteSuspect("");
    setNewNote("");
    setMessage("Notitie opgeslagen.");
    await loadAppData(profile);
  };

  const startEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditNoteText(note.note || "");
  };

  const cancelEditNote = () => {
    setEditingNoteId("");
    setEditNoteText("");
  };

  const saveEditNote = async () => {
    setError("");
    setMessage("");

    if (!editingNoteId) {
      setError("Geen notitie geselecteerd om te bewerken.");
      return;
    }

    if (!editNoteText.trim()) {
      setError("Een notitie mag niet leeg zijn.");
      return;
    }

    const { error } = await supabase
      .from("suspect_notes")
      .update({
        note: editNoteText.trim(),
      })
      .eq("id", editingNoteId);

    if (error) {
      setError(error.message);
      return;
    }

    cancelEditNote();
    setMessage("Notitie bijgewerkt.");
    await loadAppData(profile);
  };

  const deleteNote = async (note) => {
    setError("");
    setMessage("");

    const ok = window.confirm(
      "Weet je zeker dat je deze notitie wilt verwijderen?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("suspect_notes")
      .delete()
      .eq("id", note.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Notitie verwijderd.");
    await loadAppData(profile);
  };

  const saveParticipantStatus = async () => {
    setError("");
    setMessage("");

    if (!myGroup) {
      setError("Je bent nog niet aan een groep gekoppeld.");
      return;
    }

    if (!selectedStatusSuspect) {
      setError("Kies een verdachte.");
      return;
    }

    const { error } = await supabase.from("suspect_statuses").upsert(
      {
        group_id: myGroup.id,
        suspect_id: selectedStatusSuspect,
        status: newStatus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id,suspect_id" }
    );

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Status opgeslagen.");
    await loadAppData(profile);
  };

  const loadFinalReportForm = () => {
    const existingReport = finalReports.find(
      (report) => report.group_id === myGroup?.id
    );

    setFinalReportSuspect(existingReport?.suspect_id || "");
    setFinalReportMotive(existingReport?.motive || "");
    setFinalReportEvidence(existingReport?.evidence || "");
  };

  const saveFinalReport = async () => {
    setError("");
    setMessage("");

    if (!myGroup) {
      setError("Je bent nog niet aan een groep gekoppeld.");
      return;
    }

    if (!finalReportsOpen) {
      setError("Eindrapporten zijn nog gesloten door de organisatie.");
      return;
    }

    if (!finalReportSuspect) {
      setError("Kies een eindverdachte.");
      return;
    }

    const motiveText = finalReportMotiveRef.current?.value?.trim() || "";
    const evidenceText = finalReportEvidenceRef.current?.value?.trim() || "";

    if (!motiveText) {
      setError("Vul een motief of verklaring in.");
      return;
    }

    if (!evidenceText) {
      setError("Vul jullie bewijs of redenering in.");
      return;
    }

    const { error } = await supabase.from("final_reports").upsert(
      {
        group_id: myGroup.id,
        suspect_id: finalReportSuspect,
        motive: motiveText,
        evidence: evidenceText,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        submitted_by: profile.id,
      },
      { onConflict: "group_id" }
    );

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Eindrapport opgeslagen.");
    await loadAppData(profile);
    return true;
  };
  const SuspectImage = ({ src, alt, style }) => (
    <SharedSuspectImage
      src={src}
      alt={alt}
      style={style}
      onImageClick={setImageModal}
    />
  );

  const ImageModal = () => {
    if (!imageModal) return null;

    return (
      <div style={styles.modalBackdrop} onClick={() => setImageModal(null)}>
        <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <strong>{imageModal.alt}</strong>
            <button
              style={styles.buttonSecondary}
              onClick={() => setImageModal(null)}
            >
              Sluiten
            </button>
          </div>

          <img
            src={imageModal.src}
            alt={imageModal.alt}
            style={styles.modalImage}
          />
        </div>
      </div>
    );
  };
  const FinalReportEditorModal = () => {
    const existingReport = finalReports.find(
      (report) => report.group_id === myGroup?.id
    );

    if (!showFinalReportEditor) return null;

    return (
      <div
        style={styles.modalBackdrop}
        onClick={() => setShowFinalReportEditor(false)}
      >
        <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <strong>Eindrapport invullen</strong>

            <button
              style={styles.buttonSecondary}
              onClick={() => setShowFinalReportEditor(false)}
            >
              Sluiten
            </button>
          </div>

          <select
            style={styles.select}
            value={finalReportSuspect}
            onChange={(e) => setFinalReportSuspect(e.target.value)}
          >
            <option value="">Kies eindverdachte</option>
            {suspects
              .filter((suspect) => suspect.is_active)
              .map((suspect) => (
                <option key={suspect.id} value={suspect.id}>
                  {suspect.name}
                </option>
              ))}
          </select>

          <textarea
            key={`modal-motive-${existingReport?.id || "new"}-${
              existingReport?.updated_at || ""
            }`}
            style={styles.textarea}
            placeholder="Motief / verklaring: waarom is deze verdachte volgens jullie de dader?"
            defaultValue={existingReport?.motive || ""}
            ref={finalReportMotiveRef}
            autoFocus
          />

          <textarea
            key={`modal-evidence-${existingReport?.id || "new"}-${
              existingReport?.updated_at || ""
            }`}
            style={styles.textarea}
            placeholder="Bewijs / redenering: welke aanwijzingen, notities of observaties ondersteunen dit?"
            defaultValue={existingReport?.evidence || ""}
            ref={finalReportEvidenceRef}
          />

          <button
            style={styles.button}
            onClick={async () => {
              const saved = await saveFinalReport();

              if (saved) {
                setShowFinalReportEditor(false);
              }
            }}
          >
            Eindrapport opslaan
          </button>
        </div>
      </div>
    );
  };
  const StatusBadge = ({ status }) => <SharedStatusBadge status={status} />;

  const LoadingBlock = () => <SharedLoadingBlock isLoading={isLoading} />;

  const MessageBlock = () => (
    <SharedMessageBlock
      error={error}
      message={message}
      onClearError={() => setError("")}
      onClearMessage={() => setMessage("")}
    />
  );

  const Header = ({ title, subtitle }) => (
    <div style={styles.header}>
      <div style={styles.titleRow}>
        <div>
          <h1 style={{ margin: 0 }}>{title}</h1>
          {subtitle && <div style={styles.subtle}>{subtitle}</div>}

          <span
            style={{
              ...styles.badge,
              borderColor: gameMode === "live" ? "#ef4444" : "#22c55e",
            }}
          >
            {gameMode === "live" ? "🔴 LIVE SPEL" : "🧪 TESTMODUS"}
          </span>
        </div>
        <div>
          <button
            style={{
              ...styles.buttonSecondary,
              opacity: isLoading ? 0.65 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
            onClick={refreshWithLoading}
            disabled={isLoading}
          >
            {isLoading ? "Laden..." : "Ververs"}
          </button>
          <button style={styles.buttonSecondary} onClick={handleLogout}>
            Uitloggen
          </button>
        </div>
      </div>
    </div>
  );

  const AgendaBlock = () => (
    <div style={styles.card}>
      <h2>Agenda</h2>

      {nextAgendaItem ? (
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Volgende activiteit</h3>
          <strong>
            {getAgendaIcon(nextAgendaItem.item_type)} {nextAgendaItem.title}
          </strong>
          <div style={styles.subtle}>
            {formatDate(nextAgendaItem.starts_at)}
            {nextAgendaItem.ends_at
              ? ` - ${formatDate(nextAgendaItem.ends_at)}`
              : ""}
          </div>
          {nextAgendaItem.description && <p>{nextAgendaItem.description}</p>}
          {nextAgendaItem.credits_reward > 0 && (
            <span style={styles.badge}>
              💰 {nextAgendaItem.credits_reward} pegels te verdienen
            </span>
          )}
        </div>
      ) : (
        <p style={styles.subtle}>Er staat geen volgende activiteit gepland.</p>
      )}

      {visibleAgendaItems.length === 0 ? (
        <p style={styles.subtle}>Nog geen agenda-items zichtbaar.</p>
      ) : (
        visibleAgendaItems.map((item) => (
          <div key={item.id} style={{ marginBottom: 16 }}>
            <strong>
              {getAgendaIcon(item.item_type)} {item.title}
            </strong>
            <div style={styles.subtle}>
              {formatDate(item.starts_at)}
              {item.ends_at ? ` - ${formatDate(item.ends_at)}` : ""}
            </div>
            {item.description && <div>{item.description}</div>}
            {item.credits_reward > 0 && (
              <span style={styles.badge}>
                💰 {item.credits_reward} pegels te verdienen
              </span>
            )}
            {profile?.role === "admin" && !item.is_visible && (
              <span style={styles.badge}>Verborgen</span>
            )}
          </div>
        ))
      )}
    </div>
  );

  const NotificationsBlock = () => {
    const latestNotifications = notifications.slice(0, 10);

    return (
      <div style={styles.card}>
        <h2>Meldingen</h2>

        {latestNotifications.length === 0 ? (
          <div style={styles.card}>
            <strong>Nog geen meldingen</strong>
            <p style={styles.subtle}>
              Nieuwe berichten van de organisatie verschijnen hier.
            </p>
          </div>
        ) : (
          latestNotifications.map((notification) => (
            <div key={notification.id} style={styles.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <strong>{notification.title}</strong>

                <span style={styles.badge}>
                  {notification.notification_type?.includes("clue")
                    ? "Aanwijzing"
                    : notification.notification_type?.includes("broadcast")
                    ? "Algemeen"
                    : notification.notification_type?.includes("credit")
                    ? "Pegels"
                    : "Melding"}
                </span>
              </div>

              {notification.message && <p>{notification.message}</p>}

              <div style={styles.subtle}>
                {formatDate(notification.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const TransactionsBlock = () => (
    <div style={styles.card}>
      <h2>Pegels geschiedenis</h2>

      {transactions.length === 0 ? (
        <p style={styles.subtle}>Nog geen transacties.</p>
      ) : (
        transactions.map((t) => (
          <div key={t.id} style={{ marginBottom: 12 }}>
            <strong>
              {t.amount > 0 ? "+" : ""}
              {t.amount} pegels
            </strong>
            <div>{t.reason}</div>
            {t.groups?.name && <div style={styles.subtle}>{t.groups.name}</div>}
            <div style={styles.subtle}>{formatDate(t.created_at)}</div>
          </div>
        ))
      )}
    </div>
  );
  const NoGroupScreen = () => (
    <div style={styles.card}>
      <h2>Je bent nog niet aan een groep gekoppeld</h2>

      <p>
        Je account is aangemaakt, maar de organisatie heeft je nog niet aan een
        groep gekoppeld. Zodra dit is gedaan, verschijnt hier automatisch jullie
        groepsdashboard.
      </p>

      <div style={styles.card}>
        <strong>Account</strong>
        <div style={styles.subtle}>
          {profile?.display_name || profile?.email}
        </div>
        <div style={styles.subtle}>{profile?.email}</div>
      </div>

      <p style={styles.subtle}>
        Vraag de organisatie om je account aan een groep te koppelen. Daarna kun
        je op verversen drukken.
      </p>

      <button style={styles.button} onClick={() => loadAppData(profile)}>
        Ververs
      </button>

      <button style={styles.buttonSecondary} onClick={handleLogout}>
        Uitloggen
      </button>
    </div>
  );
  const ParticipantGroupBar = () => {
    const progress = getParticipantProgress();

    return (
      <div
        style={{
          ...styles.card,
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgba(39,39,42,0.98), rgba(9,9,11,0.98))",
          borderColor: "#3f3f46",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 170 }}>
            <div style={styles.subtle}>Mijn groep</div>
            <strong>{myGroup?.name || "Nog geen groep"}</strong>
          </div>

          <div>
            <div style={styles.subtle}>Pegels</div>
            <strong>💰 {myGroup?.credits || 0}</strong>
          </div>

          <div>
            <div style={styles.subtle}>Ontgrendeld</div>
            <strong>📄 {progress.unlockedCount}</strong>
          </div>

          <div>
            <div style={styles.subtle}>Notities</div>
            <strong>📝 {progress.noteCount}</strong>
          </div>
        </div>

        <div
          style={{
            ...styles.subtle,
            marginTop: 10,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={styles.badge}>Te koop: {progress.buyableCount}</span>
          <span style={styles.badge}>Statussen: {progress.statusCount}</span>
        </div>
      </div>
    );
  };
  const ParticipantDashboard = () => {
    const progress = getParticipantProgress();
    const activeSuspects = suspects.filter((suspect) => suspect.is_active);
    const latestNotification = notifications[0];
    const latestPurchase = groupClues
      .map((purchase) => ({
        purchase,
        clue:
          purchase.clues || clues.find((clue) => clue.id === purchase.clue_id),
      }))
      .filter((item) => item.clue)
      .sort(
        (a, b) =>
          new Date(b.purchase.purchased_at || b.purchase.created_at || 0) -
          new Date(a.purchase.purchased_at || a.purchase.created_at || 0)
      )[0];

    const suspectStatusCount = suspectStatuses.filter(
      (status) => status.status === "suspect"
    ).length;

    const focusItems = [];

    if (progress.buyableCount > 0) {
      focusItems.push({
        label: "Koop gericht aanwijzingen",
        text: `${progress.buyableCount} aanwijzing(en) staan nog klaar om te onderzoeken.`,
        tab: "clues",
        button: "Naar aanwijzingen",
      });
    }

    if (
      progress.statusCount < activeSuspects.length &&
      activeSuspects.length > 0
    ) {
      focusItems.push({
        label: "Werk verdachte-statussen bij",
        text: "Zet per verdachte alvast op verdacht, twijfel, uitgesloten of onbekend.",
        tab: "suspects",
        button: "Naar verdachten",
      });
    }

    if (progress.noteCount === 0 && activeSuspects.length > 0) {
      focusItems.push({
        label: "Leg jullie eerste theorie vast",
        text: "Schrijf korte notities bij verdachten, zodat jullie later niets kwijt zijn.",
        tab: "suspects",
        button: "Notitie maken",
      });
    }

    if (latestNotification) {
      focusItems.push({
        label: "Check de laatste info",
        text: latestNotification.title,
        tab: "messages",
        button: "Info openen",
      });
    }

    const visibleFocusItems = focusItems.slice(0, 3);

    return (
      <>
        <div
          style={{
            ...styles.card,
            background:
              "linear-gradient(135deg, rgba(153,27,27,0.22), rgba(24,24,27,0.98) 52%, rgba(9,9,11,0.98))",
            borderColor: "#52525b",
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <span
                style={{
                  ...styles.badge,
                  borderColor: "#ef4444",
                  color: "#fecaca",
                  background: "rgba(69,10,10,0.6)",
                }}
              >
                Onderzoekscentrum
              </span>

              <h2 style={{ fontSize: 34, margin: "10px 0 6px" }}>
                Team {myGroup?.name || "Onbekend"}
              </h2>

              <p style={{ ...styles.subtle, fontSize: 16, maxWidth: 760 }}>
                Verzamel aanwijzingen, beoordeel verdachten en bouw stap voor
                stap jullie theorie op. Alles wat jullie ontdekken, komt hier
                samen.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <span style={styles.badge}>
                💰 {myGroup?.credits || 0} pegels
              </span>
              <span style={styles.badge}>
                📄 {progress.unlockedCount} aanwijzingen
              </span>
              <span style={styles.badge}>
                🕵️ {activeSuspects.length} verdachten
              </span>
              <span style={styles.badge}>📝 {progress.noteCount} notities</span>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={{ marginTop: 0 }}>Vandaag onderzoeken</h2>
          <p style={styles.subtle}>
            Snel naar de plekken waar jullie waarschijnlijk het vaakst iets
            moeten doen. Handig op mobiel tijdens het spel.
          </p>

          {visibleFocusItems.length > 0 ? (
            <div style={styles.grid}>
              {visibleFocusItems.map((item) => (
                <div key={item.label} style={styles.card}>
                  <strong>{item.label}</strong>
                  <p style={styles.subtle}>{item.text}</p>
                  <button
                    style={styles.buttonSecondary}
                    onClick={() => setActiveParticipantTab(item.tab)}
                  >
                    {item.button}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                ...styles.card,
                background: "#09090b",
                borderColor: "#166534",
              }}
            >
              <strong>Onderzoek loopt netjes</strong>
              <p style={styles.subtle}>
                Jullie hebben aanwijzingen, notities en statussen al goed op
                gang. Gebruik de knoppen hieronder om snel verder te gaan.
              </p>
            </div>
          )}
        </div>

        <div style={styles.grid}>
          <div
            onClick={() => setActiveParticipantTab("messages")}
            title="Bekijk pegels en info"
            style={{
              ...styles.card,
              cursor: "pointer",
              borderColor: "#f59e0b",
              background:
                "linear-gradient(180deg, rgba(120,53,15,0.22), #18181b)",
            }}
          >
            <strong>💰 Pegels</strong>
            <div style={styles.statNumber}>{myGroup?.credits || 0}</div>
            <div style={styles.subtle}>Beschikbaar voor aanwijzingen</div>
          </div>

          <div
            onClick={() => setActiveParticipantTab("clues")}
            title="Bekijk aanwijzingen"
            style={{
              ...styles.card,
              cursor: "pointer",
              borderColor: "#3b82f6",
              background:
                "linear-gradient(180deg, rgba(30,64,175,0.18), #18181b)",
            }}
          >
            <strong>📄 Aanwijzingen</strong>
            <div style={styles.statNumber}>{progress.unlockedCount}</div>
            <div style={styles.subtle}>
              Ontgrendeld · {progress.buyableCount} nog te koop
            </div>
          </div>

          <div
            onClick={() => setActiveParticipantTab("suspects")}
            title="Bekijk verdachten en notities"
            style={{
              ...styles.card,
              cursor: "pointer",
              borderColor: "#a855f7",
              background:
                "linear-gradient(180deg, rgba(88,28,135,0.2), #18181b)",
            }}
          >
            <strong>📝 Notities</strong>
            <div style={styles.statNumber}>{progress.noteCount}</div>
            <div style={styles.subtle}>Door jullie groep opgeslagen</div>
          </div>

          <div
            onClick={() => setActiveParticipantTab("suspects")}
            title="Bekijk onderzochte verdachten"
            style={{
              ...styles.card,
              cursor: "pointer",
              borderColor: "#ef4444",
              background:
                "linear-gradient(180deg, rgba(127,29,29,0.22), #18181b)",
            }}
          >
            <strong>🔎 Onderzochte verdachten</strong>
            <div style={styles.statNumber}>{suspectStatusCount}</div>
            <div style={styles.subtle}>Verdachten door jullie beoordeeld</div>
          </div>
        </div>

        <div style={styles.grid}>
          <div
            onClick={() => setActiveParticipantTab("agenda")}
            title="Bekijk agenda"
            style={{ ...styles.card, minHeight: 190, cursor: "pointer" }}
          >
            <h2>🕒 Volgende activiteit</h2>

            {nextAgendaItem ? (
              <>
                <h3 style={{ marginBottom: 6 }}>
                  {getAgendaIcon(nextAgendaItem.item_type)}{" "}
                  {nextAgendaItem.title}
                </h3>

                <div style={{ ...styles.subtle, marginBottom: 10 }}>
                  {formatDate(nextAgendaItem.starts_at)}
                  {nextAgendaItem.ends_at
                    ? ` - ${formatDate(nextAgendaItem.ends_at)}`
                    : ""}
                </div>

                {nextAgendaItem.description && (
                  <p style={{ fontSize: 16 }}>{nextAgendaItem.description}</p>
                )}

                {nextAgendaItem.credits_reward > 0 && (
                  <span style={styles.badge}>
                    💰 {nextAgendaItem.credits_reward} pegels te verdienen
                  </span>
                )}
              </>
            ) : (
              <div
                style={{
                  ...styles.card,
                  background: "#09090b",
                  borderColor: "#27272a",
                }}
              >
                <strong>Geen volgende activiteit gepland</strong>
                <p style={styles.subtle}>
                  Gebruik de tijd om aanwijzingen te bekijken, statussen bij te
                  werken of jullie theorie aan te scherpen.
                </p>
              </div>
            )}
          </div>

          <div
            onClick={() => setActiveParticipantTab("messages")}
            title="Bekijk info en meldingen"
            style={{ ...styles.card, minHeight: 190, cursor: "pointer" }}
          >
            <h2>📡 Laatste ontwikkeling</h2>

            {latestNotification ? (
              <div
                style={{
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <strong>{latestNotification.title}</strong>
                {latestNotification.message && (
                  <div>{latestNotification.message}</div>
                )}
                <div style={styles.subtle}>
                  {formatDate(latestNotification.created_at)}
                </div>
              </div>
            ) : (
              <div
                style={{
                  ...styles.card,
                  background: "#09090b",
                  borderColor: "#27272a",
                }}
              >
                <strong>Nog geen nieuwe info</strong>
                <p style={styles.subtle}>
                  Berichten van de organisatie verschijnen hier zodra er iets
                  gedeeld wordt.
                </p>
              </div>
            )}

            {latestPurchase ? (
              <div
                style={{
                  background:
                    "linear-gradient(180deg, rgba(30,64,175,0.18), #09090b)",
                  border: "1px solid #3b82f6",
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <strong>📄 Laatste aanwijzing</strong>
                <div>{latestPurchase.clue?.title}</div>
                <div style={styles.subtle}>
                  {formatDate(
                    latestPurchase.purchase.purchased_at ||
                      latestPurchase.purchase.created_at
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {ENABLE_FINAL_REPORTS && (finalReportsOpen || progress.finalReport) && (
          <div
            onClick={() => setActiveParticipantTab("final")}
            title="Bekijk finale"
            style={{ ...styles.card, cursor: "pointer" }}
          >
            <h2>🏁 Finale</h2>

            {progress.finalReport ? (
              <>
                <span style={styles.badge}>Eindrapport ingediend</span>
                <div style={styles.subtle}>
                  Laatst opgeslagen:{" "}
                  {formatDate(
                    progress.finalReport.updated_at ||
                      progress.finalReport.submitted_at
                  )}
                </div>
              </>
            ) : finalReportsOpen ? (
              <>
                <span style={styles.badge}>Eindrapport open</span>
                <p style={styles.subtle}>
                  De organisatie heeft de finale geopend. Jullie kunnen nu een
                  eindrapport invullen.
                </p>
              </>
            ) : (
              <>
                <span style={styles.badge}>Eindrapport gesloten</span>
                <p style={styles.subtle}>
                  Jullie kunnen het ingediende rapport nog bekijken.
                </p>
              </>
            )}

            <button
              style={styles.button}
              onClick={() => setActiveParticipantTab("final")}
            >
              Naar finale
            </button>
          </div>
        )}
      </>
    );
  };

  const ParticipantFinalReport = () => {
    const existingReport = finalReports.find(
      (report) => report.group_id === myGroup?.id
    );

    const selectedSuspect =
      suspects.find((suspect) => suspect.id === existingReport?.suspect_id) ||
      suspects.find((suspect) => suspect.id === finalReportSuspect);

    if (!finalReportsOpen) {
      return (
        <>
          {ParticipantGroupBar()}

          <div style={styles.card}>
            <h2>Eindrapport gesloten</h2>

            {existingReport ? (
              <>
                <p style={styles.subtle}>
                  De organisatie heeft de eindrapporten gesloten. Jullie kunnen
                  het ingediende rapport nog bekijken, maar niet meer aanpassen.
                </p>

                <div style={styles.card}>
                  <strong>Ingediend eindrapport</strong>

                  <div style={styles.subtle}>
                    Laatst opgeslagen:{" "}
                    {formatDate(
                      existingReport.updated_at || existingReport.submitted_at
                    )}
                  </div>

                  <span style={styles.badge}>
                    Gekozen verdachte:{" "}
                    {existingReport.suspects?.name ||
                      suspects.find((s) => s.id === existingReport.suspect_id)
                        ?.name ||
                      "Onbekende verdachte"}
                  </span>

                  <h3>Motief / verklaring</h3>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {existingReport.motive}
                  </div>

                  <h3>Bewijs / redenering</h3>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {existingReport.evidence}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p>
                  De organisatie heeft de eindrapporten gesloten. Jullie hebben
                  geen eindrapport ingediend.
                </p>

                <p style={styles.subtle}>
                  Dit onderdeel kan nu niet meer worden ingevuld.
                </p>
              </>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        {ParticipantGroupBar()}

        <div style={styles.card}>
          <h2>Eindrapport</h2>

          <p style={styles.subtle}>
            De eindrapporten zijn geopend. Klik op de knop om jullie
            eindverdachte, motief en bewijs in te voeren. Zolang de organisatie
            de eindrapporten open laat, kunnen jullie dit nog aanpassen.
          </p>

          {existingReport ? (
            <div style={styles.card}>
              <strong>Laatste versie opgeslagen</strong>

              <div style={styles.subtle}>
                {formatDate(
                  existingReport.updated_at || existingReport.submitted_at
                )}
              </div>

              <span style={styles.badge}>
                Gekozen verdachte:{" "}
                {existingReport.suspects?.name ||
                  selectedSuspect?.name ||
                  "Onbekende verdachte"}
              </span>

              <h3>Motief / verklaring</h3>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {existingReport.motive}
              </div>

              <h3>Bewijs / redenering</h3>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {existingReport.evidence}
              </div>
            </div>
          ) : (
            <p style={styles.subtle}>
              Jullie hebben nog geen eindrapport ingediend.
            </p>
          )}

          <button
            style={styles.button}
            onClick={() => {
              setFinalReportSuspect(existingReport?.suspect_id || "");
              setShowFinalReportEditor(true);
            }}
          >
            {existingReport ? "Eindrapport aanpassen" : "Eindrapport invullen"}
          </button>
        </div>
      </>
    );
  };

  const ParticipantClues = () => {
    const visibleClues = clues.filter((clue) => clue.is_visible);

    const unlockedClues = visibleClues.filter((clue) => {
      const purchased = purchasedClueIds.includes(clue.id);
      return clue.is_free || clue.is_global || purchased;
    });

    const buyableClues = visibleClues.filter((clue) => {
      const purchased = purchasedClueIds.includes(clue.id);
      return !clue.is_free && !clue.is_global && !purchased;
    });

    const getClueSuspectName = (clue) => {
      return (
        clue.suspects?.name ||
        suspects.find((suspect) => suspect.id === clue.suspect_id)?.name ||
        ""
      );
    };

    const renderCompactClueCard = (clue, mode) => {
      const suspectName = getClueSuspectName(clue);
      const isUnlocked = mode === "unlocked";

      return (
        <div key={clue.id} style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{clue.title}</h3>

              {suspectName ? (
                <span style={styles.badge}>🕵️ {suspectName}</span>
              ) : (
                <span style={styles.badge}>Algemeen</span>
              )}

              {clue.is_free && <span style={styles.badge}>Gratis</span>}
              {clue.is_global && (
                <span style={styles.badge}>Voor iedereen</span>
              )}
              <span style={styles.badge}>📂 {getClueCategoryName(clue)}</span>

              {isUnlocked ? (
                <span style={styles.badge}>Ontgrendeld</span>
              ) : (
                <span style={styles.badge}>💰 {clue.price} pegels</span>
              )}
            </div>

            <div>
              {isUnlocked ? (
                clue.file_url ? (
                  <a
                    href={clue.file_url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.link}
                  >
                    Bestand openen
                  </a>
                ) : (
                  <span style={styles.subtle}>Geen bestand</span>
                )
              ) : (
                <button
                  style={styles.button}
                  onClick={() => purchaseClue(clue.id)}
                >
                  Kopen
                </button>
              )}
            </div>
          </div>

          {clue.description && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                Omschrijving
              </summary>
              <p style={{ marginBottom: 0 }}>{clue.description}</p>
            </details>
          )}
        </div>
      );
    };

    const groupedUnlockedClues = groupCluesByCategory(unlockedClues);
    const groupedBuyableClues = groupCluesByCategory(buyableClues);

    const renderClueGroups = (groupsToRender, mode) => {
      if (groupsToRender.length === 0) return null;

      return groupsToRender.map((group) => (
        <details key={`${mode}-${group.key}`} open style={styles.card}>
          <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 18 }}>
            {group.name} ({group.clues.length})
          </summary>

          <div style={{ marginTop: 12 }}>
            {group.clues.map((clue) => renderCompactClueCard(clue, mode))}
          </div>
        </details>
      ));
    };

    return (
      <>
        {ParticipantGroupBar()}

        <div style={styles.card}>
          <h2>Aanwijzingen</h2>

          <div style={styles.grid}>
            <div style={styles.card}>
              <strong>Ontgrendeld</strong>
              <div style={styles.statNumber}>{unlockedClues.length}</div>
              <div style={styles.subtle}>Beschikbaar voor jullie groep</div>
            </div>

            <div style={styles.card}>
              <strong>Te koop</strong>
              <div style={styles.statNumber}>{buyableClues.length}</div>
              <div style={styles.subtle}>Nog te kopen met pegels</div>
            </div>

            <div style={styles.card}>
              <strong>Pegels</strong>
              <div style={styles.statNumber}>💰 {myGroup?.credits || 0}</div>
              <div style={styles.subtle}>Huidig saldo</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2>Ontgrendeld</h2>

          {unlockedClues.length === 0 ? (
            <div
              style={{
                ...styles.card,
                background: "#09090b",
                borderColor: "#27272a",
              }}
            >
              <strong>Nog niets ontgrendeld</strong>
              <p style={styles.subtle}>
                Zodra jullie een aanwijzing kopen of gratis informatie krijgen,
                verschijnt die hier. Begin bij Te koop of wacht op informatie
                van de organisatie.
              </p>
            </div>
          ) : (
            renderClueGroups(groupedUnlockedClues, "unlocked")
          )}
        </div>

        <div style={styles.card}>
          <h2>Te koop</h2>

          {buyableClues.length === 0 ? (
            <div
              style={{
                ...styles.card,
                background: "#09090b",
                borderColor: "#166534",
              }}
            >
              <strong>Geen losse aanwijzingen meer te koop</strong>
              <p style={styles.subtle}>
                Alles wat nu beschikbaar is, staat bij Ontgrendeld. Nieuwe
                aanwijzingen kunnen later door de organisatie worden toegevoegd
                of vrijgegeven.
              </p>
            </div>
          ) : (
            renderClueGroups(groupedBuyableClues, "buyable")
          )}
        </div>
      </>
    );
  };
  const ParticipantSuspects = () => {
    const activeSuspects = suspects.filter((s) => s.is_active);
    const selectedSuspect =
      activeSuspects.find(
        (suspect) => suspect.id === selectedParticipantSuspect
      ) ||
      activeSuspects[0] ||
      null;
    const visibleSuspectDossiers = selectedSuspect ? [selectedSuspect] : [];

    const getNotesForSuspect = (suspectId) => {
      return suspectNotes
        .filter((note) => note.suspect_id === suspectId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    };

    const getStatusForSuspect = (suspectId) => {
      return suspectStatuses.find(
        (item) => item.group_id === myGroup?.id && item.suspect_id === suspectId
      );
    };

    const saveStatusForSuspect = async (suspectId, status) => {
      setError("");
      setMessage("");

      if (!myGroup) {
        setError("Je bent nog niet aan een groep gekoppeld.");
        return;
      }

      const { error } = await supabase.from("suspect_statuses").upsert(
        {
          group_id: myGroup.id,
          suspect_id: suspectId,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "group_id,suspect_id" }
      );

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Status opgeslagen.");
      await loadAppData(profile);
    };

    const addNoteForSuspect = async (suspectId) => {
      setError("");
      setMessage("");

      if (!myGroup) {
        setError("Je bent nog niet aan een groep gekoppeld.");
        return;
      }

      if (!newNote.trim()) {
        setError("Vul een notitie in.");
        return;
      }

      const { error } = await supabase.from("suspect_notes").insert({
        group_id: myGroup.id,
        suspect_id: suspectId,
        user_id: profile.id,
        note: newNote.trim(),
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSelectedNoteSuspect("");
      setNewNote("");
      setMessage("Notitie opgeslagen.");
      await loadAppData(profile);
    };

    return (
      <>
        <div style={styles.card}>
          <h2>Verdachten</h2>

          <p style={styles.subtle}>
            Kies een verdachte en werk direct in één dossier met status, profiel
            en notities.
          </p>

          {activeSuspects.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Dossier kiezen</strong>
              <select
                style={{ ...styles.select, marginTop: 8 }}
                value={selectedSuspect?.id || ""}
                onChange={(e) => setSelectedParticipantSuspect(e.target.value)}
              >
                {activeSuspects.map((suspect) => (
                  <option key={suspect.id} value={suspect.id}>
                    {suspect.name}
                  </option>
                ))}
              </select>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                {activeSuspects.map((suspect) => (
                  <button
                    key={suspect.id}
                    type="button"
                    style={
                      selectedSuspect?.id === suspect.id
                        ? { ...styles.button, padding: "8px 11px" }
                        : { ...styles.buttonSecondary, padding: "8px 11px" }
                    }
                    onClick={() => setSelectedParticipantSuspect(suspect.id)}
                  >
                    {suspect.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}
          >
            <span style={styles.badge}>
              📝 {suspectNotes.length} notitie(s)
            </span>
            <span style={styles.badge}>
              🏷️ {suspectStatuses.length} status(sen)
            </span>
          </div>
        </div>

        {activeSuspects.length === 0 ? (
          <div
            style={{
              ...styles.card,
              background: "#09090b",
              borderColor: "#27272a",
            }}
          >
            <strong>Nog geen actieve verdachten</strong>
            <p style={styles.subtle}>
              De organisatie moet eerst verdachten actief zetten. Daarna kunnen
              jullie hier statussen en notities bijhouden.
            </p>
          </div>
        ) : (
          visibleSuspectDossiers.map((suspect) => {
            const statusRecord = getStatusForSuspect(suspect.id);
            const notesForSuspect = getNotesForSuspect(suspect.id);
            const isAddingNote = selectedNoteSuspect === suspect.id;

            return (
              <div key={suspect.id} style={styles.card}>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    {suspect.photo_url ? (
                      <img
                        src={suspect.photo_url}
                        alt={suspect.name}
                        style={{
                          ...styles.img,
                          width: 82,
                          height: 82,
                          marginBottom: 0,
                        }}
                        onClick={() =>
                          setImageModal({
                            src: suspect.photo_url,
                            alt: suspect.name,
                          })
                        }
                      />
                    ) : (
                      <div
                        style={{
                          width: 82,
                          height: 82,
                          borderRadius: 12,
                          border: "1px solid #52525b",
                          background: "#09090b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                        }}
                      >
                        🕵️
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 220 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 6 }}>
                      {suspect.name}
                    </h3>

                    <div style={{ marginBottom: 8 }}>
                      {StatusBadge({
                        status: statusRecord?.status || "unknown",
                      })}
                      <span style={styles.badge}>
                        📝 {notesForSuspect.length} notitie(s)
                      </span>
                    </div>

                    {suspect.description && (
                      <details style={{ marginTop: 10 }}>
                        <summary
                          style={{
                            cursor: "pointer",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 10px",
                            border: "1px solid #3f3f46",
                            borderRadius: 999,
                            background: "#18181b",
                            width: "fit-content",
                          }}
                        >
                          Profiel bekijken
                        </summary>

                        <div
                          style={{
                            ...styles.subtle,
                            marginTop: 10,
                            padding: 10,
                            border: "1px solid #27272a",
                            borderRadius: 12,
                            background: "#09090b",
                          }}
                        >
                          {suspect.description}
                        </div>
                      </details>
                    )}
                  </div>
                </div>

                <div style={styles.card}>
                  <strong>Status</strong>

                  <div style={{ marginTop: 10 }}>
                    <button
                      style={
                        statusRecord?.status === "suspect"
                          ? styles.button
                          : styles.buttonSecondary
                      }
                      onClick={() =>
                        saveStatusForSuspect(suspect.id, "suspect")
                      }
                    >
                      Verdacht
                    </button>

                    <button
                      style={
                        statusRecord?.status === "doubt"
                          ? styles.button
                          : styles.buttonSecondary
                      }
                      onClick={() => saveStatusForSuspect(suspect.id, "doubt")}
                    >
                      Twijfel
                    </button>

                    <button
                      style={
                        statusRecord?.status === "excluded"
                          ? styles.button
                          : styles.buttonSecondary
                      }
                      onClick={() =>
                        saveStatusForSuspect(suspect.id, "excluded")
                      }
                    >
                      Uitgesloten
                    </button>

                    <button
                      style={
                        !statusRecord || statusRecord.status === "unknown"
                          ? styles.button
                          : styles.buttonSecondary
                      }
                      onClick={() =>
                        saveStatusForSuspect(suspect.id, "unknown")
                      }
                    >
                      Onbekend
                    </button>
                  </div>
                </div>

                <div style={styles.card}>
                  <strong>Notities</strong>

                  {notesForSuspect.length === 0 ? (
                    <div
                      style={{
                        ...styles.card,
                        background: "#09090b",
                        borderColor: "#27272a",
                      }}
                    >
                      <strong>Nog geen notities over deze verdachte</strong>
                      <p style={styles.subtle}>
                        Leg hier korte observaties, alibi-twijfels of losse
                        theorieën vast. Dan blijft jullie spoor later terug te
                        vinden.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "#09090b",
                        border: "1px solid #27272a",
                        borderRadius: 12,
                        padding: 12,
                        marginTop: 10,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {notesForSuspect.map((note, index) => (
                        <div key={note.id} style={{ marginBottom: 12 }}>
                          {index > 0 && (
                            <div
                              style={{
                                borderTop: "1px solid #27272a",
                                margin: "10px 0",
                              }}
                            />
                          )}

                          {editingNoteId === note.id ? (
                            <>
                              <textarea
                                style={styles.textarea}
                                value={editNoteText}
                                onChange={(e) =>
                                  setEditNoteText(e.target.value)
                                }
                              />

                              <button
                                style={styles.button}
                                onClick={saveEditNote}
                              >
                                Opslaan
                              </button>

                              <button
                                style={styles.buttonSecondary}
                                onClick={cancelEditNote}
                              >
                                Annuleren
                              </button>
                            </>
                          ) : (
                            <>
                              <div>{note.note}</div>

                              <div style={styles.subtle}>
                                {note.profiles?.display_name ||
                                  note.profiles?.email ||
                                  "onbekend"}{" "}
                                · {formatDate(note.created_at)}
                              </div>

                              {note.user_id === profile?.id && (
                                <div style={{ marginTop: 8 }}>
                                  <button
                                    style={styles.buttonSecondary}
                                    onClick={() => startEditNote(note)}
                                  >
                                    Bewerken
                                  </button>

                                  <button
                                    style={styles.buttonDanger}
                                    onClick={() => deleteNote(note)}
                                  >
                                    Verwijderen
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isAddingNote ? (
                    <div style={{ marginTop: 12 }}>
                      <textarea
                        style={styles.textarea}
                        placeholder={`Nieuwe notitie over ${suspect.name}`}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                      />

                      <button
                        style={styles.button}
                        onClick={() => addNoteForSuspect(suspect.id)}
                      >
                        Notitie opslaan
                      </button>

                      <button
                        style={styles.buttonSecondary}
                        onClick={() => {
                          setSelectedNoteSuspect("");
                          setNewNote("");
                        }}
                      >
                        Annuleren
                      </button>
                    </div>
                  ) : (
                    <button
                      style={styles.buttonSecondary}
                      onClick={() => {
                        setSelectedNoteSuspect(suspect.id);
                        setNewNote("");
                      }}
                    >
                      Notitie toevoegen
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </>
    );
  };
  const AdminParticipantPreview = () => {
    const activeSuspects = suspects.filter((suspect) => suspect.is_active);
    const visibleClues = clues.filter((clue) => clue.is_visible);
    const visibleAgenda = agendaItems
      .filter((item) => item.is_visible)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

    const freeOrGlobalClues = visibleClues.filter(
      (clue) => clue.is_free || clue.is_global
    );

    const buyableClues = visibleClues.filter(
      (clue) => !clue.is_free && !clue.is_global
    );

    const previewWarnings = [];

    if (visibleAgenda.length === 0) {
      previewWarnings.push("Deelnemers zien nog geen agenda-items.");
    }

    if (visibleClues.length === 0) {
      previewWarnings.push("Deelnemers zien nog geen aanwijzingen.");
    }

    if (activeSuspects.length === 0) {
      previewWarnings.push("Deelnemers zien nog geen actieve verdachten.");
    }

    return (
      <div style={styles.card}>
        <h2>Deelnemer-preview</h2>
        <p style={styles.subtle}>
          Controleer hier snel wat deelnemers ongeveer zien zonder opnieuw als
          deelnemer in te loggen.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h3>Agenda zichtbaar</h3>
            <div style={styles.statNumber}>{visibleAgenda.length}</div>
            <div style={styles.subtle}>Zichtbare agenda-items</div>
          </div>

          <div style={styles.card}>
            <h3>Aanwijzingen zichtbaar</h3>
            <div style={styles.statNumber}>{visibleClues.length}</div>
            <span style={styles.badge}>
              Gratis/global: {freeOrGlobalClues.length}
            </span>
            <span style={styles.badge}>Te koop: {buyableClues.length}</span>
          </div>

          <div style={styles.card}>
            <h3>Verdachten zichtbaar</h3>
            <div style={styles.statNumber}>{activeSuspects.length}</div>
            <div style={styles.subtle}>Actieve verdachten</div>
          </div>
        </div>

        <div style={styles.card}>
          <h3>Preview-waarschuwingen</h3>

          {previewWarnings.length === 0 ? (
            <p style={styles.ok}>De deelnemerweergave lijkt gevuld.</p>
          ) : (
            previewWarnings.map((warning) => (
              <div key={warning} style={styles.error}>
                ⚠️ {warning}
              </div>
            ))
          )}
        </div>

        <div style={styles.card}>
          <h3>Agenda zoals deelnemer die ziet</h3>

          {visibleAgenda.length === 0 ? (
            <p style={styles.subtle}>Geen zichtbare agenda-items.</p>
          ) : (
            visibleAgenda.map((item) => (
              <div key={item.id} style={styles.card}>
                <strong>
                  {getAgendaIcon(item.item_type)} {item.title}
                </strong>
                <div style={styles.subtle}>
                  {formatDate(item.starts_at)}
                  {item.ends_at ? ` - ${formatDate(item.ends_at)}` : ""}
                </div>
                {item.description && <div>{item.description}</div>}
                {item.credits_reward > 0 && (
                  <span style={styles.badge}>
                    💰 {item.credits_reward} pegels
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div style={styles.card}>
          <h3>Aanwijzingen zoals deelnemer die ziet</h3>

          {visibleClues.length === 0 ? (
            <p style={styles.subtle}>Geen zichtbare aanwijzingen.</p>
          ) : (
            visibleClues.map((clue) => (
              <div key={clue.id} style={styles.card}>
                <strong>{clue.title}</strong>

                {clue.suspects?.name && (
                  <span style={styles.badge}>🕵️ {clue.suspects.name}</span>
                )}

                {clue.is_free && <span style={styles.badge}>Gratis</span>}
                {clue.is_global && (
                  <span style={styles.badge}>Voor iedereen</span>
                )}

                {!clue.is_free && !clue.is_global && (
                  <span style={styles.badge}>💰 {clue.price} pegels</span>
                )}

                {clue.description && <p>{clue.description}</p>}

                {clue.file_url ? (
                  <div style={styles.subtle}>Bestand gekoppeld</div>
                ) : (
                  <div style={styles.error}>Geen bestand gekoppeld</div>
                )}
              </div>
            ))
          )}
        </div>

        <div style={styles.card}>
          <h3>Verdachten zoals deelnemer die ziet</h3>

          {activeSuspects.length === 0 ? (
            <p style={styles.subtle}>Geen actieve verdachten.</p>
          ) : (
            activeSuspects.map((suspect) => (
              <div key={suspect.id} style={styles.card}>
                {SuspectImage({
                  src: suspect.photo_url,
                  alt: suspect.name,
                })}

                <strong>{suspect.name}</strong>

                {suspect.description && (
                  <div style={styles.subtle}>{suspect.description}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };
  const AdminSetupCheck = () => {
    const participantProfiles = profiles.filter((p) => p.role !== "admin");

    const usersWithoutGroup = participantProfiles.filter((p) => {
      return !memberships.some((m) => m.user_id === p.id);
    });

    const activeGroups = groups.filter((group) => group.is_active);
    const inactiveGroups = groups.filter((group) => !group.is_active);

    const activeSuspects = suspects.filter((suspect) => suspect.is_active);
    const inactiveSuspects = suspects.filter((suspect) => !suspect.is_active);

    const visibleClues = clues.filter((clue) => clue.is_visible);
    const hiddenClues = clues.filter((clue) => !clue.is_visible);
    const cluesWithoutFile = clues.filter((clue) => !clue.file_url);

    const visibleAgendaItems = agendaItems.filter((item) => item.is_visible);
    const hiddenAgendaItems = agendaItems.filter((item) => !item.is_visible);

    const setupWarnings = [];

    if (activeGroups.length === 0) {
      setupWarnings.push("Er zijn nog geen actieve groepen.");
    }

    if (usersWithoutGroup.length > 0) {
      setupWarnings.push(
        `${usersWithoutGroup.length} deelnemer(s) zijn nog niet aan een groep gekoppeld.`
      );
    }

    if (activeSuspects.length === 0) {
      setupWarnings.push("Er zijn nog geen actieve verdachten.");
    }

    if (visibleClues.length === 0) {
      setupWarnings.push("Er zijn nog geen zichtbare aanwijzingen.");
    }

    if (cluesWithoutFile.length > 0) {
      setupWarnings.push(
        `${cluesWithoutFile.length} aanwijzing(en) hebben nog geen bestand.`
      );
    }

    if (visibleAgendaItems.length === 0) {
      setupWarnings.push("Er zijn nog geen zichtbare agenda-items.");
    }

    return (
      <div style={styles.card}>
        <h2>Spel klaarzetten</h2>

        <div style={styles.card}>
          <h3>Spelmodus</h3>

          <span
            style={{
              ...styles.badge,
              borderColor: gameMode === "live" ? "#ef4444" : "#22c55e",
            }}
          >
            {gameMode === "live" ? "🔴 LIVE SPEL" : "🧪 TESTMODUS"}
          </span>

          <p style={styles.subtle}>
            In testmodus kun je testdata resetten. In live-modus wordt resetten
            geblokkeerd en is extra voorzichtigheid nodig bij beheeracties.
          </p>

          {gameMode === "test" ? (
            <button
              style={styles.buttonDanger}
              onClick={() => updateGameMode("live")}
            >
              Zet spel live
            </button>
          ) : (
            <button
              style={styles.buttonSecondary}
              onClick={() => updateGameMode("test")}
            >
              Terug naar testmodus
            </button>
          )}
        </div>
        <div style={styles.card}>
          <h3>Demo-data</h3>

          <p style={styles.subtle}>
            Laad een gevulde demo-set met groepen, verdachten, aanwijzingen,
            notities, statussen, meldingen en pegeltransacties. Alleen data met
            prefix <strong>DEMO -</strong> wordt vervangen of verwijderd.
          </p>

          {gameMode === "test" ? (
            <>
              <button style={styles.button} onClick={loadDemoData}>
                Demo-data laden
              </button>

              <button
                style={styles.buttonDanger}
                onClick={() => deleteDemoData()}
              >
                Demo-data verwijderen
              </button>
            </>
          ) : (
            <p style={styles.error}>
              Demo-data is geblokkeerd omdat het spel live staat.
            </p>
          )}
        </div>
        <p style={styles.subtle}>
          Controlepaneel vóór de start: hiermee zie je snel of groepen,
          deelnemers, verdachten, aanwijzingen en agenda klaarstaan.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h3>Groepen</h3>
            <div style={styles.statNumber}>{groups.length}</div>
            <span style={styles.badge}>Actief: {activeGroups.length}</span>
            <span style={styles.badge}>Inactief: {inactiveGroups.length}</span>
          </div>

          <div style={styles.card}>
            <h3>Deelnemers</h3>
            <div style={styles.statNumber}>{participantProfiles.length}</div>
            <span style={styles.badge}>
              Zonder groep: {usersWithoutGroup.length}
            </span>
          </div>

          <div style={styles.card}>
            <h3>Verdachten</h3>
            <div style={styles.statNumber}>{suspects.length}</div>
            <span style={styles.badge}>Actief: {activeSuspects.length}</span>
            <span style={styles.badge}>
              Inactief: {inactiveSuspects.length}
            </span>
          </div>

          <div style={styles.card}>
            <h3>Aanwijzingen</h3>
            <div style={styles.statNumber}>{clues.length}</div>
            <span style={styles.badge}>Zichtbaar: {visibleClues.length}</span>
            <span style={styles.badge}>Verborgen: {hiddenClues.length}</span>
            <span style={styles.badge}>
              Zonder bestand: {cluesWithoutFile.length}
            </span>
          </div>

          <div style={styles.card}>
            <h3>Agenda</h3>
            <div style={styles.statNumber}>{agendaItems.length}</div>
            <span style={styles.badge}>
              Zichtbaar: {visibleAgendaItems.length}
            </span>
            <span style={styles.badge}>
              Verborgen: {hiddenAgendaItems.length}
            </span>
          </div>
        </div>

        <div style={styles.card}>
          <h3>Waarschuwingen</h3>

          {setupWarnings.length === 0 ? (
            <p style={styles.ok}>Alles lijkt klaar voor de start.</p>
          ) : (
            setupWarnings.map((warning) => (
              <div key={warning} style={styles.error}>
                ⚠️ {warning}
              </div>
            ))
          )}
        </div>

        <div style={styles.card}>
          <h3>Deelnemers zonder groep</h3>

          {usersWithoutGroup.length === 0 ? (
            <p style={styles.ok}>
              Alle deelnemers zijn gekoppeld aan een groep.
            </p>
          ) : (
            usersWithoutGroup.map((p) => (
              <div key={p.id} style={styles.card}>
                <strong>{p.display_name || p.email}</strong>
                <div style={styles.subtle}>{p.email}</div>
                <div style={styles.error}>
                  Nog niet gekoppeld aan een groep.
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.card}>
          <h3>Aanwijzingen zonder bestand</h3>

          {cluesWithoutFile.length === 0 ? (
            <p style={styles.ok}>
              Alle aanwijzingen hebben een bestand of link.
            </p>
          ) : (
            cluesWithoutFile.map((clue) => (
              <div key={clue.id} style={styles.card}>
                <strong>{clue.title}</strong>
                <div style={styles.subtle}>
                  {clue.suspects?.name || "Algemeen"}
                </div>
                <div style={styles.error}>Geen bestand gekoppeld.</div>
              </div>
            ))
          )}
        </div>

        <div style={styles.card}>
          <h3>Backup & export</h3>

          <p style={styles.subtle}>
            Nachtbackups draaien alleen wanneer het spel in LIVE-modus staat. In
            testmodus wordt automatische backup bewust overgeslagen, zodat
            testdata geen backup-archief vult.
          </p>

          <div
            style={{
              ...styles.card,
              borderColor: latestBackupInfo ? "#166534" : "#52525b",
              background: latestBackupInfo
                ? "linear-gradient(180deg, rgba(20,83,45,0.14), #18181b)"
                : "#18181b",
            }}
          >
            <strong>Laatste Supabase backup</strong>

            {latestBackupInfo ? (
              <>
                <div style={styles.ok}>
                  ✅ {formatDate(latestBackupInfo.created_at)}
                </div>
                <div style={styles.subtle}>
                  Pad: {latestBackupInfo.path || "onbekend"}
                </div>
                {latestBackupInfo.source && (
                  <span style={styles.badge}>
                    Bron: {latestBackupInfo.source}
                  </span>
                )}
                {latestBackupInfo.record_counts && (
                  <div style={{ marginTop: 8 }}>
                    {Object.entries(latestBackupInfo.record_counts).map(
                      ([name, count]) => (
                        <span key={name} style={styles.badge}>
                          {name}: {count}
                        </span>
                      )
                    )}
                  </div>
                )}
              </>
            ) : (
              <p style={styles.subtle}>
                Nog geen automatische LIVE-backup gevonden.
              </p>
            )}
          </div>

          {gameMode === "live" ? (
            <button
              style={{
                ...styles.button,
                opacity: isBackupRunning ? 0.65 : 1,
                cursor: isBackupRunning ? "not-allowed" : "pointer",
              }}
              onClick={createLiveBackup}
              disabled={isBackupRunning}
            >
              {isBackupRunning
                ? "Backup wordt gemaakt..."
                : "Handmatige LIVE-backup maken"}
            </button>
          ) : (
            <p style={styles.error}>
              Supabase nachtbackup staat uit zolang het spel in testmodus staat.
            </p>
          )}

          <p style={styles.subtle}>
            Lokale export blijft beschikbaar als snelle handmatige noodkopie. Je
            browser downloadt dan meerdere CSV-bestanden achter elkaar.
          </p>

          <button
            style={styles.buttonSecondary}
            onClick={exportCompleteCsvBackup}
          >
            Volledige CSV-backup downloaden
          </button>

          <button style={styles.buttonSecondary} onClick={exportFullBackup}>
            Technische JSON-backup downloaden
          </button>
        </div>
      </div>
    );
  };
  const AdminLiveGameStatus = () => {
    const activeGroups = groups.filter((group) => group.is_active);

    return (
      <div style={styles.card}>
        <h2>🖥️ Live spelstatus per groep</h2>

        <p style={styles.subtle}>
          Snel overzicht voor de organisatie: pegels, activiteit, aanwijzingen,
          notities, statussen en waarschuwingen per groep.
        </p>

        {groups.length === 0 ? (
          <p style={styles.subtle}>Nog geen groepen.</p>
        ) : (
          groups.map((group) => {
            const bought = groupClues.filter(
              (item) => item.group_id === group.id
            );
            const notes = suspectNotes.filter(
              (item) => item.group_id === group.id
            );
            const statuses = suspectStatuses.filter(
              (item) => item.group_id === group.id
            );
            const groupNotifications = notifications.filter(
              (item) => item.group_id === group.id
            );
            const finalReport = getGroupFinalReport(group.id);
            const lastNotification = groupNotifications[0];
            const lastActivity = getGroupLastActivity(group.id);

            const suspectCount = statuses.filter(
              (item) => item.status === "suspect"
            ).length;
            const doubtCount = statuses.filter(
              (item) => item.status === "doubt"
            ).length;
            const excludedCount = statuses.filter(
              (item) => item.status === "excluded"
            ).length;

            const warnings = [];

            if (!group.is_active) warnings.push("Groep staat inactief");
            if ((group.credits || 0) <= 3) warnings.push("Weinig pegels over");
            if (bought.length === 0) warnings.push("Nog geen aanwijzingen");
            if (bought.length >= 3 && notes.length === 0)
              warnings.push("Veel gekocht, maar nog geen notities");
            if (
              bought.length === 0 &&
              notes.length === 0 &&
              statuses.length === 0
            )
              warnings.push("Nog weinig activiteit");
            if (
              ENABLE_FINAL_REPORTS &&
              finalReportsOpen &&
              !finalReport &&
              group.is_active
            )
              warnings.push("Eindrapport ontbreekt");

            if (lastActivity) {
              const minutesSinceActivity =
                (new Date() - new Date(lastActivity)) / 1000 / 60;
              if (minutesSinceActivity > 60)
                warnings.push("Al meer dan 60 minuten geen activiteit");
            }

            return (
              <div
                key={group.id}
                style={{
                  ...styles.card,
                  borderColor: warnings.length > 0 ? "#52525b" : "#166534",
                  background:
                    warnings.length > 0
                      ? "linear-gradient(180deg, rgba(24,24,27,0.98), rgba(9,9,11,0.95))"
                      : "linear-gradient(180deg, rgba(20,83,45,0.12), rgba(24,24,27,0.98))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <h3 style={{ marginTop: 0, marginBottom: 6 }}>
                      {group.name}
                    </h3>
                    <span style={styles.badge}>
                      {group.is_active ? "Actief" : "Inactief"}
                    </span>
                    {ENABLE_FINAL_REPORTS && (
                      <span style={styles.badge}>
                        {finalReport
                          ? "🏁 Eindrapport ingediend"
                          : "🏁 Geen eindrapport"}
                      </span>
                    )}
                    {lastActivity && (
                      <span style={styles.badge}>
                        Laatste actie: {formatDate(lastActivity)}
                      </span>
                    )}
                  </div>

                  <div>
                    <button
                      style={styles.buttonSecondary}
                      onClick={() => setActiveAdminTab("groups")}
                    >
                      Groepen
                    </button>
                    <button
                      style={styles.buttonSecondary}
                      onClick={() => setActiveAdminTab("credits")}
                    >
                      Pegels / melding
                    </button>
                    {ENABLE_FINAL_REPORTS && (
                      <button
                        style={styles.buttonSecondary}
                        onClick={() => setActiveAdminTab("final")}
                      >
                        Finale
                      </button>
                    )}
                  </div>
                </div>

                <div style={styles.grid}>
                  <div style={styles.card}>
                    <strong>💰 Pegels</strong>
                    <div style={styles.statNumber}>{group.credits || 0}</div>
                  </div>
                  <div style={styles.card}>
                    <strong>📄 Aanwijzingen</strong>
                    <div style={styles.statNumber}>{bought.length}</div>
                  </div>
                  <div style={styles.card}>
                    <strong>📝 Notities</strong>
                    <div style={styles.statNumber}>{notes.length}</div>
                  </div>
                  <div style={styles.card}>
                    <strong>🕵️ Statussen</strong>
                    <div style={styles.statNumber}>{statuses.length}</div>
                    <div style={styles.subtle}>
                      Verdacht: {suspectCount} · Twijfel: {doubtCount} ·
                      Uitgesloten: {excludedCount}
                    </div>
                  </div>
                </div>

                <div style={styles.grid}>
                  <div style={styles.card}>
                    <strong>Laatste melding</strong>
                    {lastNotification ? (
                      <>
                        <div>{lastNotification.title}</div>
                        {lastNotification.message && (
                          <div style={styles.subtle}>
                            {lastNotification.message}
                          </div>
                        )}
                        <div style={styles.subtle}>
                          {formatDate(lastNotification.created_at)}
                        </div>
                      </>
                    ) : (
                      <div style={styles.subtle}>Nog geen meldingen.</div>
                    )}
                  </div>

                  <div
                    style={{
                      ...styles.card,
                      borderColor: warnings.length > 0 ? "#ef4444" : "#166534",
                      background:
                        warnings.length > 0
                          ? "linear-gradient(180deg, rgba(69,10,10,0.28), #18181b)"
                          : "linear-gradient(180deg, rgba(20,83,45,0.14), #18181b)",
                    }}
                  >
                    <strong>Waarschuwingen</strong>
                    {warnings.length > 0 ? (
                      warnings.map((warning) => (
                        <div
                          key={warning}
                          style={{ ...styles.error, fontWeight: 800 }}
                        >
                          ⚠️ {warning}
                        </div>
                      ))
                    ) : (
                      <p style={styles.ok}>Geen directe waarschuwingen.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {activeGroups.length === 0 && groups.length > 0 && (
          <p style={styles.error}>
            Er zijn groepen, maar geen actieve groepen.
          </p>
        )}
      </div>
    );
  };

  const AdminFinalReportStatusCard = () => {
    if (!ENABLE_FINAL_REPORTS) return null;

    const activeGroups = groups.filter((group) => group.is_active);

    const submittedGroupIds = finalReports
      .map((report) => report.group_id)
      .filter(Boolean);

    const missingGroups = activeGroups.filter(
      (group) => !submittedGroupIds.includes(group.id)
    );

    const submittedCount = activeGroups.length - missingGroups.length;

    return (
      <div
        style={{
          ...styles.card,
          borderColor: finalReportsOpen ? "#22c55e" : "#ef4444",
          background: finalReportsOpen
            ? "linear-gradient(180deg, rgba(20,83,45,0.12), rgba(24,24,27,0.98))"
            : "linear-gradient(180deg, rgba(69,10,10,0.16), rgba(24,24,27,0.98))",
        }}
      >
        <h2>🏁 Finale / eindrapporten</h2>

        <span
          style={{
            ...styles.badge,
            borderColor: finalReportsOpen ? "#22c55e" : "#ef4444",
          }}
        >
          {finalReportsOpen ? "Open voor deelnemers" : "Gesloten"}
        </span>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h3>Actieve groepen</h3>
            <div style={styles.statNumber}>{activeGroups.length}</div>
          </div>

          <div style={styles.card}>
            <h3>Ingediend</h3>
            <div style={styles.statNumber}>{submittedCount}</div>
          </div>

          <div style={styles.card}>
            <h3>Nog ontbrekend</h3>
            <div style={styles.statNumber}>{missingGroups.length}</div>
          </div>
        </div>

        {missingGroups.length === 0 && activeGroups.length > 0 ? (
          <p style={styles.ok}>
            Alle actieve groepen hebben een eindrapport ingediend.
          </p>
        ) : (
          <div style={styles.card}>
            <strong>Ontbrekende groepen</strong>

            {missingGroups.length === 0 ? (
              <p style={styles.subtle}>Geen actieve groepen.</p>
            ) : (
              missingGroups.map((group) => (
                <span key={group.id} style={styles.badge}>
                  {group.name}
                </span>
              ))
            )}
          </div>
        )}

        <button
          style={styles.buttonSecondary}
          onClick={() => setActiveAdminTab("final")}
        >
          Naar finale-overzicht
        </button>
      </div>
    );
  };
  const AdminDashboard = () => {
    const activeGroups = groups.filter((group) => group.is_active).length;
    const inactiveGroups = groups.filter((group) => !group.is_active).length;
    const activeSuspects = suspects.filter(
      (suspect) => suspect.is_active
    ).length;
    const inactiveSuspects = suspects.filter(
      (suspect) => !suspect.is_active
    ).length;
    const visibleClues = clues.filter((clue) => clue.is_visible).length;
    const hiddenClues = clues.filter((clue) => !clue.is_visible).length;
    const creditsInPlay = groups.reduce(
      (total, group) => total + Number(group.credits || 0),
      0
    );
    const creditsAwarded = transactions
      .filter((transaction) => Number(transaction.amount) > 0)
      .reduce(
        (total, transaction) => total + Number(transaction.amount || 0),
        0
      );
    const creditsSpentOrRemoved = Math.abs(
      transactions
        .filter((transaction) => Number(transaction.amount) < 0)
        .reduce(
          (total, transaction) => total + Number(transaction.amount || 0),
          0
        )
    );

    return (
      <>
        <div
          style={{
            ...styles.card,
            background:
              "linear-gradient(135deg, rgba(153,27,27,0.2), rgba(24,24,27,0.98) 55%, rgba(9,9,11,0.98))",
            borderColor: "#52525b",
            padding: 22,
          }}
        >
          <span
            style={{
              ...styles.badge,
              borderColor: "#ef4444",
              color: "#fecaca",
              background: "rgba(69,10,10,0.55)",
            }}
          >
            Control Room overzicht
          </span>
          <h2 style={{ fontSize: 32, margin: "10px 0 8px" }}>
            Spel in één oogopslag
          </h2>
          <p style={{ ...styles.subtle, fontSize: 16 }}>
            Live stand van groepen, aanwijzingen, pegels, notities en statussen.
            Klik op een kaart om direct naar het juiste scherm te gaan.
          </p>

          <div style={styles.grid}>
            <div
              onClick={() => setActiveAdminTab("groups")}
              title="Bekijk groepen en aankopen"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>👥 Actieve groepen</strong>
              <div style={styles.statNumber}>{activeGroups}</div>
              <span style={styles.badge}>Inactief: {inactiveGroups}</span>
            </div>
            <div
              onClick={() => setActiveAdminTab("manage")}
              title="Bekijk verdachtenbeheer"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>🕵️ Verdachten</strong>
              <div style={styles.statNumber}>{suspects.length}</div>
              <span style={styles.badge}>Actief: {activeSuspects}</span>
              <span style={styles.badge}>Inactief: {inactiveSuspects}</span>
            </div>
            <div
              onClick={() => setActiveAdminTab("groups")}
              title="Bekijk gekochte aanwijzingen"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>📄 Aankopen</strong>
              <div style={styles.statNumber}>{groupClues.length}</div>
              <div style={styles.subtle}>Gekocht/toegewezen</div>
            </div>
            <div
              onClick={() => setActiveAdminTab("interrogation")}
              title="Bekijk notities in het verhoorpaneel"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>📝 Notities</strong>
              <div style={styles.statNumber}>{suspectNotes.length}</div>
              <div style={styles.subtle}>Door groepjes ingevoerd</div>
            </div>
            <div
              onClick={() => setActiveAdminTab("interrogation")}
              title="Bekijk statussen in het verhoorpaneel"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>🏷️ Statussen</strong>
              <div style={styles.statNumber}>{suspectStatuses.length}</div>
              <div style={styles.subtle}>Verdachte beoordelingen</div>
            </div>
            <div
              onClick={() => setActiveAdminTab("credits")}
              title="Bekijk pegels en meldingen"
              style={{ ...styles.card, cursor: "pointer" }}
            >
              <strong>💰 Pegels in spel</strong>
              <div style={styles.statNumber}>{creditsInPlay}</div>
              <div style={styles.subtle}>
                Uitgedeeld: {creditsAwarded} · Af: {creditsSpentOrRemoved}
              </div>
            </div>
          </div>
        </div>

        {ENABLE_FINAL_REPORTS && AdminFinalReportStatusCard()}

        {AdminLiveGameStatus()}
      </>
    );
  };

  const AdminManage = () => (
    <div style={styles.grid}>
      <div style={styles.card}>
        <h2>Nieuwe groep</h2>
        <input
          style={styles.input}
          placeholder="Groepsnaam"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <button style={styles.button} onClick={createGroup}>
          Groep maken
        </button>

        <h2>Gebruiker koppelen aan groep</h2>
        <select
          style={styles.select}
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">Selecteer gebruiker</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name || p.email} ({p.email})
            </option>
          ))}
        </select>

        <select
          style={styles.select}
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
        >
          <option value="">Selecteer groep</option>
          {groups
            .filter((group) => group.is_active)
            .map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
        </select>

        <button style={styles.button} onClick={addUserToGroup}>
          Toevoegen
        </button>
        <h2>Suspect-account koppelen</h2>

        <p style={styles.subtle}>
          Koppel een gebruiker met rol suspect aan een verdachte. Deze gebruiker
          krijgt daarna een eigen verdachte-dashboard.
        </p>

        <select
          style={styles.select}
          value={selectedSuspectUser}
          onChange={(e) => setSelectedSuspectUser(e.target.value)}
        >
          <option value="">Selecteer suspect-gebruiker</option>
          {profiles
            .filter((p) => p.role === "suspect")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name || p.email} ({p.email})
              </option>
            ))}
        </select>

        <select
          style={styles.select}
          value={selectedProfileSuspect}
          onChange={(e) => setSelectedProfileSuspect(e.target.value)}
        >
          <option value="">Selecteer verdachte</option>
          {suspects.map((suspect) => (
            <option key={suspect.id} value={suspect.id}>
              {suspect.name}
            </option>
          ))}
        </select>

        <button style={styles.button} onClick={linkUserToSuspect}>
          Suspect koppelen
        </button>

        <div style={{ marginTop: 12 }}>
          <strong>Gekoppelde suspect-accounts</strong>

          {profiles.filter((p) => p.role === "suspect").length === 0 ? (
            <div style={styles.subtle}>Nog geen suspect-gebruikers.</div>
          ) : (
            profiles
              .filter((p) => p.role === "suspect")
              .map((p) => {
                const linkedSuspect = suspects.find(
                  (s) => s.id === p.suspect_id
                );

                return (
                  <div key={p.id} style={styles.card}>
                    <strong>{p.display_name || p.email}</strong>
                    <div style={styles.subtle}>{p.email}</div>
                    <span style={styles.badge}>
                      {linkedSuspect
                        ? `Gekoppeld aan: ${linkedSuspect.name}`
                        : "Nog niet gekoppeld"}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2>Verdachte toevoegen</h2>
        <input
          style={styles.input}
          placeholder="Naam verdachte"
          value={newSuspectName}
          onChange={(e) => setNewSuspectName(e.target.value)}
        />
        <textarea
          style={styles.textarea}
          placeholder="Omschrijving"
          value={newSuspectDescription}
          onChange={(e) => setNewSuspectDescription(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Foto URL, optioneel"
          value={newSuspectPhotoUrl}
          onChange={(e) => setNewSuspectPhotoUrl(e.target.value)}
        />
        <input
          style={styles.input}
          type="file"
          id="suspect-file"
          accept="image/*"
        />
        <button
          style={styles.button}
          onClick={() => {
            const file = document.getElementById("suspect-file")?.files?.[0];
            createSuspect(file);
          }}
        >
          Verdachte toevoegen
        </button>
        <div style={{ marginTop: 18 }}>
          <h3>Verdachten beheren</h3>

          {suspects.length === 0 ? (
            <p style={styles.subtle}>Nog geen verdachten.</p>
          ) : (
            suspects.map((suspect) => (
              <div key={suspect.id} style={styles.card}>
                {editingSuspectId === suspect.id ? (
                  <>
                    <h3>Verdachte bewerken</h3>

                    <input
                      style={styles.input}
                      placeholder="Naam verdachte"
                      value={editSuspectName}
                      onChange={(e) => setEditSuspectName(e.target.value)}
                    />

                    <textarea
                      style={styles.textarea}
                      placeholder="Omschrijving"
                      value={editSuspectDescription}
                      onChange={(e) =>
                        setEditSuspectDescription(e.target.value)
                      }
                    />

                    <input
                      style={styles.input}
                      placeholder="Foto URL"
                      value={editSuspectPhotoUrl}
                      onChange={(e) => setEditSuspectPhotoUrl(e.target.value)}
                    />

                    <div style={styles.card}>
                      <strong>Foto vervangen</strong>

                      <p style={styles.subtle}>
                        Kies alleen een nieuw bestand als je de bestaande foto
                        wilt vervangen. Laat dit leeg om de huidige foto of
                        foto-URL te behouden.
                      </p>

                      {suspect.photo_url ? (
                        <div style={{ marginBottom: 10 }}>
                          {SuspectImage({
                            src: suspect.photo_url,
                            alt: suspect.name,
                          })}
                        </div>
                      ) : (
                        <div style={styles.subtle}>
                          Er is nog geen foto gekoppeld.
                        </div>
                      )}

                      <input
                        style={styles.input}
                        type="file"
                        accept="image/*"
                        ref={editSuspectFileRef}
                      />
                    </div>

                    <button style={styles.button} onClick={saveEditSuspect}>
                      Opslaan
                    </button>

                    <button
                      style={styles.buttonSecondary}
                      onClick={cancelEditSuspect}
                    >
                      Annuleren
                    </button>
                  </>
                ) : (
                  <>
                    {SuspectImage({
                      src: suspect.photo_url,
                      alt: suspect.name,
                    })}

                    <strong>{suspect.name}</strong>

                    <div style={styles.subtle}>
                      {suspect.description || "Geen omschrijving."}
                    </div>

                    {suspect.is_active ? (
                      <span style={styles.badge}>Actief</span>
                    ) : (
                      <span style={styles.badge}>Inactief</span>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <button
                        style={styles.buttonSecondary}
                        onClick={() => startEditSuspect(suspect)}
                      >
                        Bewerken
                      </button>

                      <button
                        style={styles.buttonSecondary}
                        onClick={() => toggleSuspectActive(suspect)}
                      >
                        {suspect.is_active
                          ? "Verdachte inactief zetten"
                          : "Verdachte actief zetten"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2>Agenda-item toevoegen</h2>
        <input
          style={styles.input}
          placeholder="Titel"
          value={newAgenda.title}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, title: e.target.value }))
          }
        />
        <textarea
          style={styles.textarea}
          placeholder="Omschrijving"
          value={newAgenda.description}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, description: e.target.value }))
          }
        />
        <input
          style={styles.input}
          type="datetime-local"
          value={newAgenda.starts_at}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, starts_at: e.target.value }))
          }
        />
        <input
          style={styles.input}
          type="datetime-local"
          value={newAgenda.ends_at}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, ends_at: e.target.value }))
          }
        />
        <select
          style={styles.select}
          value={newAgenda.item_type}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, item_type: e.target.value }))
          }
        >
          <option value="activity">🕵️ Activiteit</option>
          <option value="food">🍽️ Eten</option>
          <option value="credits">💰 Pegels verdienen</option>
          <option value="deadline">⏰ Deadline</option>
          <option value="free_time">💤 Vrije tijd</option>
        </select>
        <input
          style={styles.input}
          type="number"
          placeholder="Pegels te verdienen"
          value={newAgenda.credits_reward}
          onChange={(e) =>
            setNewAgenda((p) => ({ ...p, credits_reward: e.target.value }))
          }
        />
        <label>
          <input
            type="checkbox"
            checked={newAgenda.is_visible}
            onChange={(e) =>
              setNewAgenda((p) => ({ ...p, is_visible: e.target.checked }))
            }
          />{" "}
          Zichtbaar voor deelnemers
        </label>
        <br />
        <br />
        <button style={styles.button} onClick={createAgendaItem}>
          Agenda-item toevoegen
        </button>
        <div style={{ marginTop: 18 }}>
          <h3>Agenda beheren</h3>

          {agendaItems.length === 0 ? (
            <p style={styles.subtle}>Nog geen agenda-items.</p>
          ) : (
            agendaItems.map((item) => (
              <div key={item.id} style={styles.card}>
                {editingAgendaId === item.id ? (
                  <>
                    <h3>Agenda-item bewerken</h3>

                    <input
                      style={styles.input}
                      placeholder="Titel"
                      value={editAgenda.title}
                      onChange={(e) =>
                        setEditAgenda((p) => ({ ...p, title: e.target.value }))
                      }
                    />

                    <textarea
                      style={styles.textarea}
                      placeholder="Omschrijving"
                      value={editAgenda.description}
                      onChange={(e) =>
                        setEditAgenda((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                    />

                    <input
                      style={styles.input}
                      type="datetime-local"
                      value={editAgenda.starts_at}
                      onChange={(e) =>
                        setEditAgenda((p) => ({
                          ...p,
                          starts_at: e.target.value,
                        }))
                      }
                    />

                    <input
                      style={styles.input}
                      type="datetime-local"
                      value={editAgenda.ends_at}
                      onChange={(e) =>
                        setEditAgenda((p) => ({
                          ...p,
                          ends_at: e.target.value,
                        }))
                      }
                    />

                    <select
                      style={styles.select}
                      value={editAgenda.item_type}
                      onChange={(e) =>
                        setEditAgenda((p) => ({
                          ...p,
                          item_type: e.target.value,
                        }))
                      }
                    >
                      <option value="activity">🕵️ Activiteit</option>
                      <option value="food">🍽️ Eten</option>
                      <option value="credits">💰 Pegels verdienen</option>
                      <option value="deadline">⏰ Deadline</option>
                      <option value="free_time">💤 Vrije tijd</option>
                    </select>

                    <input
                      style={styles.input}
                      type="number"
                      placeholder="Pegels te verdienen"
                      value={editAgenda.credits_reward}
                      onChange={(e) =>
                        setEditAgenda((p) => ({
                          ...p,
                          credits_reward: e.target.value,
                        }))
                      }
                    />

                    <label>
                      <input
                        type="checkbox"
                        checked={editAgenda.is_visible}
                        onChange={(e) =>
                          setEditAgenda((p) => ({
                            ...p,
                            is_visible: e.target.checked,
                          }))
                        }
                      />{" "}
                      Zichtbaar voor deelnemers
                    </label>

                    <br />
                    <br />

                    <button style={styles.button} onClick={saveEditAgenda}>
                      Opslaan
                    </button>

                    <button
                      style={styles.buttonSecondary}
                      onClick={cancelEditAgenda}
                    >
                      Annuleren
                    </button>
                  </>
                ) : (
                  <>
                    <strong>
                      {getAgendaIcon(item.item_type)} {item.title}
                    </strong>

                    <div style={styles.subtle}>
                      {formatDate(item.starts_at)}
                      {item.ends_at ? ` - ${formatDate(item.ends_at)}` : ""}
                    </div>

                    {item.description && <div>{item.description}</div>}

                    {item.credits_reward > 0 && (
                      <span style={styles.badge}>
                        💰 {item.credits_reward} pegels
                      </span>
                    )}

                    {item.is_visible ? (
                      <span style={styles.badge}>Zichtbaar</span>
                    ) : (
                      <span style={styles.badge}>Verborgen</span>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <button
                        style={styles.buttonSecondary}
                        onClick={() => startEditAgenda(item)}
                      >
                        Bewerken
                      </button>

                      <button
                        style={styles.buttonSecondary}
                        onClick={() => toggleAgendaVisible(item)}
                      >
                        {item.is_visible ? "Verbergen" : "Zichtbaar maken"}
                      </button>

                      <button
                        style={styles.buttonDanger}
                        onClick={() => deleteAgendaItem(item)}
                      >
                        Verwijderen
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <div style={styles.card}>
        <h2>Testdata resetten</h2>

        {gameMode === "test" ? (
          <>
            <p style={styles.subtle}>
              Hiermee verwijder je gekochte aanwijzingen, notities, statussen,
              meldingen en pegel-transacties. Groepen, gebruikers, verdachten,
              agenda-items en aanwijzingen blijven bestaan.
            </p>

            <button style={styles.buttonDanger} onClick={resetTestData}>
              Reset testdata
            </button>
          </>
        ) : (
          <p style={styles.error}>
            Reset testdata is uitgeschakeld omdat het spel live staat.
          </p>
        )}
      </div>
    </div>
  );

  const getComponentContext = () => ({
    supabase,
    styles,
    formatDate,
    getAgendaIcon,
    toDateTimeLocalValue,
    getStatusLabel,
    reloadTimer,
    isTypingRef,
    editClueFileRef,
    editSuspectFileRef,
    finalReportMotiveRef,
    finalReportEvidenceRef,
    session,
    setSession,
    profile,
    setProfile,
    email,
    setEmail,
    password,
    setPassword,
    displayName,
    setDisplayName,
    groups,
    setGroups,
    profiles,
    setProfiles,
    memberships,
    setMemberships,
    suspects,
    setSuspects,
    agendaItems,
    setAgendaItems,
    notifications,
    setNotifications,
    transactions,
    setTransactions,
    clues,
    setClues,
    clueCategories,
    setClueCategories,
    groupClues,
    setGroupClues,
    suspectNotes,
    setSuspectNotes,
    suspectStatuses,
    setSuspectStatuses,
    activeParticipantTab,
    setActiveParticipantTab,
    activeAdminTab,
    setActiveAdminTab,
    selectedParticipantSuspect,
    setSelectedParticipantSuspect,
    selectedSuspectDossier,
    setSelectedSuspectDossier,
    selectedInterrogationSuspect,
    setSelectedInterrogationSuspect,
    newGroupName,
    setNewGroupName,
    selectedUser,
    setSelectedUser,
    editingGroupId,
    setEditingGroupId,
    editGroupName,
    setEditGroupName,
    selectedGroup,
    setSelectedGroup,
    manualClueGroup,
    setManualClueGroup,
    manualClueId,
    setManualClueId,
    manualClueMode,
    setManualClueMode,
    selectedManualClueGroups,
    setSelectedManualClueGroups,
    selectedSuspectUser,
    setSelectedSuspectUser,
    selectedProfileSuspect,
    setSelectedProfileSuspect,
    newSuspectName,
    setNewSuspectName,
    newSuspectDescription,
    setNewSuspectDescription,
    newSuspectPhotoUrl,
    setNewSuspectPhotoUrl,
    editingSuspectId,
    setEditingSuspectId,
    editSuspectName,
    setEditSuspectName,
    editSuspectDescription,
    setEditSuspectDescription,
    editSuspectPhotoUrl,
    setEditSuspectPhotoUrl,
    newAgenda,
    setNewAgenda,
    newClueTitle,
    setNewClueTitle,
    newClueDescription,
    setNewClueDescription,
    newCluePrice,
    setNewCluePrice,
    newClueSuspect,
    setNewClueSuspect,
    newClueCategory,
    setNewClueCategory,
    newClueIsFree,
    setNewClueIsFree,
    newClueIsGlobal,
    setNewClueIsGlobal,
    editingClueId,
    setEditingClueId,
    editClueTitle,
    setEditClueTitle,
    editClueDescription,
    setEditClueDescription,
    editCluePrice,
    setEditCluePrice,
    editClueSuspect,
    setEditClueSuspect,
    editClueCategory,
    setEditClueCategory,
    editClueIsFree,
    setEditClueIsFree,
    editClueIsGlobal,
    setEditClueIsGlobal,
    editClueIsVisible,
    setEditClueIsVisible,
    newClueCategoryName,
    setNewClueCategoryName,
    editingCategoryId,
    setEditingCategoryId,
    editClueCategoryName,
    setEditClueCategoryName,
    editingAgendaId,
    setEditingAgendaId,
    editAgenda,
    setEditAgenda,
    newNotificationGroup,
    setNewNotificationGroup,
    newNotificationTitle,
    setNewNotificationTitle,
    newNotificationMessage,
    setNewNotificationMessage,
    notificationMode,
    setNotificationMode,
    selectedNotificationGroups,
    setSelectedNotificationGroups,
    creditGroup,
    setCreditGroup,
    creditAmount,
    setCreditAmount,
    creditReason,
    setCreditReason,
    selectedNoteSuspect,
    setSelectedNoteSuspect,
    newNote,
    setNewNote,
    selectedStatusSuspect,
    setSelectedStatusSuspect,
    newStatus,
    setNewStatus,
    editingNoteId,
    setEditingNoteId,
    editNoteText,
    setEditNoteText,
    error,
    setError,
    message,
    setMessage,
    imageModal,
    setImageModal,
    expandedNoteIds,
    setExpandedNoteIds,
    gameMode,
    setGameMode,
    isLandingDomain,
    isLoading,
    setIsLoading,
    isBackupRunning,
    setIsBackupRunning,
    latestBackupInfo,
    setLatestBackupInfo,
    finalReportsOpen,
    setFinalReportsOpen,
    finalReports,
    setFinalReports,
    finalReportSuspect,
    setFinalReportSuspect,
    finalReportMotive,
    setFinalReportMotive,
    finalReportEvidence,
    setFinalReportEvidence,
    showFinalReportEditor,
    setShowFinalReportEditor,
    myMemberships,
    myGroups,
    myGroup,
    purchasedClueIds,
    visibleAgendaItems,
    nextAgendaItem,
    adminStats,
    scheduleReload,
    appFocusHandlers,
    clearAppData,
    loadSession,
    loadProfile,
    loadAppData,
    refreshWithLoading,
    handleRegister,
    handleLogin,
    handleLogout,
    uploadFileToBucket,
    createGroup,
    startEditGroup,
    saveEditGroup,
    cancelEditGroup,
    addUserToGroup,
    linkUserToSuspect,
    removeUserFromGroup,
    createSuspect,
    startEditSuspect,
    cancelEditSuspect,
    saveEditSuspect,
    createAgendaItem,
    createClue,
    toggleSelectedManualClueGroup,
    toggleSelectedNotificationGroup,
    sendNotification,
    giveCredits,
    changeCredits,
    toggleClueVisible,
    startEditClue,
    cancelEditClue,
    saveEditClue,
    deleteClue,
    toggleAgendaVisible,
    startEditAgenda,
    cancelEditAgenda,
    saveEditAgenda,
    deleteAgendaItem,
    toggleSuspectActive,
    toggleGroupActive,
    getGroupLastActivity,
    getGroupFinalReport,
    getParticipantProgress,
    getClueCategoryName,
    groupCluesByCategory,
    createClueCategory,
    startEditClueCategory,
    cancelEditClueCategory,
    saveEditClueCategory,
    toggleClueCategoryActive,
    shouldShowParticipantFinalTab,
    assignClueToGroup,
    updateGameMode,
    updateFinalReportsOpen,
    createLiveBackup,
    safeCsvValue,
    downloadTextFile,
    buildCsvContent,
    downloadCsv,
    getExportStamp,
    exportFullBackup,
    exportNotesCsv,
    exportStatusesCsv,
    exportPurchasesCsv,
    exportTransactionsCsv,
    exportFinalReportsCsv,
    exportCompleteCsvBackup,
    resetTestData,
    removeGroupClue,
    deleteDemoData,
    loadDemoData,
    purchaseClue,
    addParticipantNote,
    startEditNote,
    cancelEditNote,
    saveEditNote,
    deleteNote,
    saveParticipantStatus,
    loadFinalReportForm,
    saveFinalReport,
    SuspectImage,
    ImageModal,
    FinalReportEditorModal,
    StatusBadge,
    LoadingBlock,
    MessageBlock,
    Header,
    AgendaBlock,
    NotificationsBlock,
    TransactionsBlock,
    NoGroupScreen,
    ParticipantGroupBar,
    ParticipantDashboard,
    ParticipantFinalReport,
    ParticipantClues,
    ParticipantSuspects,
    AdminParticipantPreview,
    AdminSetupCheck,
    AdminLiveGameStatus,
    AdminFinalReportStatusCard,
    AdminDashboard,
    AdminManage,
    AdminClues,
    AdminCreditsAndNotifications,
    AdminPurchasesOverview,
    AdminGroupsList,
    AdminFinalReports,
    groupNotesBy,
    AdminInterrogationPanel,
    SuspectDashboard,
    LandingPage,
    LoginScreen,
  });

  const AdminClues = () => <AdminCluesPanel ctx={getComponentContext()} />;

  const AdminCreditsAndNotifications = () => (
    <div style={styles.grid}>
      <div style={styles.card}>
        <h2>Pegels beheren</h2>
        <select
          style={styles.select}
          value={creditGroup}
          onChange={(e) => setCreditGroup(e.target.value)}
        >
          <option value="">Selecteer groep</option>
          {groups
            .filter((group) => group.is_active)
            .map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
        </select>
        <input
          style={styles.input}
          type="number"
          placeholder="Aantal pegels, mag negatief zijn"
          value={creditAmount}
          onChange={(e) => setCreditAmount(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Reden"
          value={creditReason}
          onChange={(e) => setCreditReason(e.target.value)}
        />
        <button style={styles.button} onClick={giveCredits}>
          Pegels aanpassen
        </button>
        <div style={{ marginTop: 10 }}>
          <button
            style={styles.buttonSecondary}
            onClick={() =>
              changeCredits(creditGroup, 1, "Snelle correctie: +1 pegel")
            }
          >
            +1
          </button>
          <button
            style={styles.buttonSecondary}
            onClick={() =>
              changeCredits(creditGroup, 5, "Snelle correctie: +5 pegels")
            }
          >
            +5
          </button>
          <button
            style={styles.buttonSecondary}
            onClick={() =>
              changeCredits(creditGroup, 10, "Snelle correctie: +10 pegels")
            }
          >
            +10
          </button>
          <button
            style={styles.buttonSecondary}
            onClick={() =>
              changeCredits(creditGroup, -1, "Snelle correctie: -1 pegel")
            }
          >
            -1
          </button>
          <button
            style={styles.buttonSecondary}
            onClick={() =>
              changeCredits(creditGroup, -5, "Snelle correctie: -5 pegels")
            }
          >
            -5
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2>Notificatie sturen</h2>

        <div style={styles.card}>
          <strong>Ontvangers</strong>

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="radio"
              name="notificationMode"
              checked={notificationMode === "single"}
              onChange={() => setNotificationMode("single")}
            />{" "}
            Eén groep
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="radio"
              name="notificationMode"
              checked={notificationMode === "all"}
              onChange={() => setNotificationMode("all")}
            />{" "}
            Alle actieve groepen
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="radio"
              name="notificationMode"
              checked={notificationMode === "selection"}
              onChange={() => setNotificationMode("selection")}
            />{" "}
            Selectie van groepen
          </label>
        </div>

        {notificationMode === "single" && (
          <select
            style={styles.select}
            value={newNotificationGroup}
            onChange={(e) => setNewNotificationGroup(e.target.value)}
          >
            <option value="">Selecteer groep</option>
            {groups
              .filter((group) => group.is_active)
              .map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
          </select>
        )}

        {notificationMode === "all" && (
          <div style={styles.card}>
            <strong>Alle actieve groepen</strong>
            <div style={styles.subtle}>
              Deze melding wordt naar{" "}
              {groups.filter((group) => group.is_active).length} actieve
              groep(en) gestuurd.
            </div>
          </div>
        )}

        {notificationMode === "selection" && (
          <div style={styles.card}>
            <strong>Selecteer groepen</strong>

            {groups.filter((group) => group.is_active).length === 0 ? (
              <p style={styles.subtle}>Geen actieve groepen beschikbaar.</p>
            ) : (
              groups
                .filter((group) => group.is_active)
                .map((group) => (
                  <label
                    key={group.id}
                    style={{
                      display: "block",
                      marginTop: 10,
                      padding: 10,
                      border: "1px solid #27272a",
                      borderRadius: 12,
                      background: selectedNotificationGroups.includes(group.id)
                        ? "#27272a"
                        : "#09090b",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNotificationGroups.includes(group.id)}
                      onChange={() => toggleSelectedNotificationGroup(group.id)}
                    />{" "}
                    {group.name}
                  </label>
                ))
            )}

            <div style={styles.subtle}>
              Geselecteerd: {selectedNotificationGroups.length} groep(en)
            </div>
          </div>
        )}

        <input
          style={styles.input}
          placeholder="Titel"
          value={newNotificationTitle}
          onChange={(e) => setNewNotificationTitle(e.target.value)}
        />

        <textarea
          style={styles.textarea}
          placeholder="Bericht"
          value={newNotificationMessage}
          onChange={(e) => setNewNotificationMessage(e.target.value)}
        />

        <button style={styles.button} onClick={sendNotification}>
          {notificationMode === "all"
            ? "Versturen naar alle actieve groepen"
            : notificationMode === "selection"
            ? `Versturen naar ${selectedNotificationGroups.length} groep(en)`
            : "Versturen"}
        </button>
      </div>

      {NotificationsBlock()}
      {TransactionsBlock()}
    </div>
  );

  const AdminPurchasesOverview = () => {
    const purchasesByClue = clues
      .map((clue) => {
        const purchases = groupClues
          .filter((purchase) => purchase.clue_id === clue.id)
          .map((purchase) => {
            const group =
              purchase.groups ||
              groups.find((item) => item.id === purchase.group_id);

            return { purchase, group };
          })
          .filter((item) => item.group);

        return { clue, purchases };
      })
      .filter((item) => item.purchases.length > 0)
      .sort((a, b) => a.clue.title.localeCompare(b.clue.title));

    const purchasesByGroup = groups
      .map((group) => {
        const purchases = groupClues
          .filter((purchase) => purchase.group_id === group.id)
          .map((purchase) => {
            const clue =
              purchase.clues ||
              clues.find((item) => item.id === purchase.clue_id);
            const suspect =
              clue?.suspects ||
              suspects.find((item) => item.id === clue?.suspect_id);

            return { purchase, clue, suspect };
          })
          .filter((item) => item.clue)
          .sort((a, b) => a.clue.title.localeCompare(b.clue.title));

        return { group, purchases };
      })
      .filter((item) => item.purchases.length > 0)
      .sort((a, b) => a.group.name.localeCompare(b.group.name));

    const getPurchaseMoment = (purchase) =>
      purchase.released_at ||
      purchase.requested_at ||
      purchase.purchased_at ||
      purchase.created_at ||
      "";

    return (
      <div style={styles.card}>
        <h2>📄 Aankopen per aanwijzing en groep</h2>
        <p style={styles.subtle}>
          Snel spelregie-overzicht: welke aanwijzingen zijn door welke groep
          gekocht of vrijgegeven.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <strong>Totaal gekocht/toegewezen</strong>
            <div style={styles.statNumber}>{groupClues.length}</div>
          </div>
          <div style={styles.card}>
            <strong>Aanwijzingen met kopers</strong>
            <div style={styles.statNumber}>{purchasesByClue.length}</div>
          </div>
          <div style={styles.card}>
            <strong>Groepen met aankopen</strong>
            <div style={styles.statNumber}>{purchasesByGroup.length}</div>
          </div>
        </div>

        {groupClues.length === 0 ? (
          <p style={styles.subtle}>
            Nog geen aanwijzingen gekocht of vrijgegeven.
          </p>
        ) : (
          <div style={styles.grid}>
            <div style={styles.card}>
              <h3>Per aanwijzing</h3>

              {purchasesByClue.map(({ clue, purchases }) => {
                const suspectName =
                  clue.suspects?.name ||
                  suspects.find((item) => item.id === clue.suspect_id)?.name ||
                  "Algemeen";

                return (
                  <div key={clue.id} style={styles.card}>
                    <strong>{clue.title}</strong>
                    <div>
                      <span style={styles.badge}>🕵️ {suspectName}</span>
                      <span style={styles.badge}>
                        👥 {purchases.length} groep(en)
                      </span>
                      {clue.price !== undefined && (
                        <span style={styles.badge}>💰 {clue.price}</span>
                      )}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      {purchases.map(({ purchase, group }) => (
                        <span key={purchase.id} style={styles.badge}>
                          {group.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.card}>
              <h3>Per groep</h3>

              {purchasesByGroup.map(({ group, purchases }) => (
                <div key={group.id} style={styles.card}>
                  <strong>{group.name}</strong>
                  <div>
                    <span style={styles.badge}>
                      📄 {purchases.length} aanwijzing(en)
                    </span>
                    <span style={styles.badge}>
                      💰 {group.credits} pegels over
                    </span>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    {purchases.map(({ purchase, clue, suspect }) => (
                      <div
                        key={purchase.id}
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px solid #27272a",
                        }}
                      >
                        <strong>{clue.title}</strong>
                        <div>
                          <span style={styles.badge}>
                            🕵️ {suspect?.name || "Algemeen"}
                          </span>
                          {purchase.status && (
                            <span style={styles.badge}>{purchase.status}</span>
                          )}
                          {purchase.source && (
                            <span style={styles.badge}>{purchase.source}</span>
                          )}
                        </div>
                        {getPurchaseMoment(purchase) && (
                          <div style={styles.subtle}>
                            {formatDate(getPurchaseMoment(purchase))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const AdminGroupsList = () => (
    <>
      {AdminPurchasesOverview()}

      <div style={styles.card}>
        <h2>Groepen & gekochte aanwijzingen</h2>

        {groups.length === 0 ? (
          <p style={styles.subtle}>Nog geen groepen.</p>
        ) : (
          groups.map((g) => {
            const members = memberships.filter((m) => m.group_id === g.id);
            const bought = groupClues.filter((c) => c.group_id === g.id);

            return (
              <div key={g.id} style={styles.card}>
                {editingGroupId === g.id ? (
                  <div>
                    <h3 style={{ marginTop: 0 }}>Groep bewerken</h3>

                    <input
                      style={styles.input}
                      placeholder="Groepsnaam"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                    />

                    <button style={styles.button} onClick={saveEditGroup}>
                      Opslaan
                    </button>

                    <button
                      style={styles.buttonSecondary}
                      onClick={cancelEditGroup}
                    >
                      Annuleren
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 style={{ marginTop: 0 }}>{g.name}</h3>

                    <button
                      style={styles.buttonSecondary}
                      onClick={() => startEditGroup(g)}
                    >
                      Groepsnaam bewerken
                    </button>
                  </>
                )}

                <span style={styles.badge}>💰 {g.credits} pegels</span>
                <span style={styles.badge}>👥 {members.length} leden</span>
                <span style={styles.badge}>📄 {bought.length} gekocht</span>
                {g.is_active ? (
                  <span style={styles.badge}>Actief</span>
                ) : (
                  <span style={styles.badge}>Inactief</span>
                )}

                <div style={{ marginTop: 10 }}>
                  <button
                    style={styles.buttonSecondary}
                    onClick={() => toggleGroupActive(g)}
                  >
                    {g.is_active
                      ? "Groep inactief zetten"
                      : "Groep actief zetten"}
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <strong>Leden</strong>

                  {members.length === 0 ? (
                    <div style={styles.subtle}>Geen leden gekoppeld.</div>
                  ) : (
                    members.map((m) => {
                      const p = profiles.find((x) => x.id === m.user_id);

                      return (
                        <div key={m.id} style={styles.card}>
                          <strong>
                            {p?.display_name || p?.email || m.user_id}
                          </strong>
                          {p?.email && (
                            <div style={styles.subtle}>{p.email}</div>
                          )}

                          <button
                            style={styles.buttonDanger}
                            onClick={() => removeUserFromGroup(m)}
                          >
                            Verwijderen uit groep
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  <strong>Gekochte aanwijzingen</strong>

                  {bought.length === 0 ? (
                    <div style={styles.subtle}>
                      Nog geen aanwijzingen gekocht.
                    </div>
                  ) : (
                    bought.map((purchase) => {
                      const clue =
                        purchase.clues ||
                        clues.find((item) => item.id === purchase.clue_id);

                      const suspectName =
                        clue?.suspects?.name ||
                        suspects.find((s) => s.id === clue?.suspect_id)?.name ||
                        "Algemeen";

                      return (
                        <div key={purchase.id} style={styles.card}>
                          <strong>
                            {clue?.title || "Onbekende aanwijzing"}
                          </strong>

                          <div>
                            <span style={styles.badge}>🕵️ {suspectName}</span>
                            {clue?.price !== undefined && (
                              <span style={styles.badge}>💰 {clue.price}</span>
                            )}
                          </div>

                          {(purchase.released_at ||
                            purchase.requested_at ||
                            purchase.purchased_at ||
                            purchase.created_at) && (
                            <div style={styles.subtle}>
                              Moment:{" "}
                              {formatDate(
                                purchase.released_at ||
                                  purchase.requested_at ||
                                  purchase.purchased_at ||
                                  purchase.created_at
                              )}
                            </div>
                          )}

                          {(clue?.file_url || clue?.pdf_url) && (
                            <div style={{ marginTop: 8 }}>
                              <a
                                href={clue.file_url || clue.pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                style={styles.link}
                              >
                                Bestand openen
                              </a>
                            </div>
                          )}
                          <div style={{ marginTop: 10 }}>
                            <button
                              style={styles.buttonDanger}
                              onClick={() => removeGroupClue(purchase)}
                            >
                              {gameMode === "test"
                                ? "Verwijderen bij groep"
                                : "Verwijderen geblokkeerd live"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
  const AdminFinalReports = () => {
    const activeGroups = groups.filter((group) => group.is_active);

    return (
      <div style={styles.card}>
        <h2>Eindrapporten</h2>

        <div style={styles.card}>
          <h3>Status eindrapporten</h3>

          <span
            style={{
              ...styles.badge,
              borderColor: finalReportsOpen ? "#22c55e" : "#ef4444",
            }}
          >
            {finalReportsOpen ? "Open voor deelnemers" : "Gesloten"}
          </span>

          <p style={styles.subtle}>
            Zolang eindrapporten open zijn, kunnen groepen hun rapport indienen
            en aanpassen. Zodra je sluit, kunnen ze niet meer wijzigen.
          </p>

          {finalReportsOpen ? (
            <button
              style={styles.buttonDanger}
              onClick={() => updateFinalReportsOpen(false)}
            >
              Eindrapporten sluiten
            </button>
          ) : (
            <button
              style={styles.button}
              onClick={() => updateFinalReportsOpen(true)}
            >
              Eindrapporten openen
            </button>
          )}
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h3>Ingediend</h3>
            <div style={styles.statNumber}>{finalReports.length}</div>
            <div style={styles.subtle}>Aantal ontvangen eindrapporten</div>
          </div>

          <div style={styles.card}>
            <h3>Nog niet ingediend</h3>
            <div style={styles.statNumber}>
              {Math.max(activeGroups.length - finalReports.length, 0)}
            </div>
            <div style={styles.subtle}>Actieve groepen zonder eindrapport</div>
          </div>
        </div>

        <div style={styles.card}>
          <h3>Overzicht per groep</h3>

          {activeGroups.length === 0 ? (
            <p style={styles.subtle}>Geen actieve groepen.</p>
          ) : (
            activeGroups.map((group) => {
              const report = finalReports.find(
                (item) => item.group_id === group.id
              );

              return (
                <div key={group.id} style={styles.card}>
                  <h3 style={{ marginTop: 0 }}>{group.name}</h3>

                  {report ? (
                    <>
                      <span style={styles.badge}>Ingediend</span>
                      <span style={styles.badge}>
                        Verdachte:{" "}
                        {report.suspects?.name ||
                          suspects.find((s) => s.id === report.suspect_id)
                            ?.name ||
                          "Onbekend"}
                      </span>

                      <div style={styles.subtle}>
                        Ingediend: {formatDate(report.submitted_at)}
                      </div>

                      <h4>Motief / verklaring</h4>
                      <div style={{ whiteSpace: "pre-wrap" }}>
                        {report.motive}
                      </div>

                      <h4>Bewijs / redenering</h4>
                      <div style={{ whiteSpace: "pre-wrap" }}>
                        {report.evidence}
                      </div>
                    </>
                  ) : (
                    <>
                      <span style={styles.badge}>Nog niet ingediend</span>
                      <p style={styles.subtle}>
                        Deze groep heeft nog geen eindrapport opgeslagen.
                      </p>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const groupNotesBy = (items, getKey) => {
    return items.reduce((result, item) => {
      const key = getKey(item) || "unknown";

      if (!result[key]) {
        result[key] = [];
      }

      result[key].push(item);
      return result;
    }, {});
  };

  const AdminInterrogationPanel = () => {
    const visibleSuspects = selectedInterrogationSuspect
      ? suspects.filter(
          (suspect) => suspect.id === selectedInterrogationSuspect
        )
      : suspects;

    return (
      <div style={styles.card}>
        <h2>🎭 CSI Verhoorkamer</h2>
        <p style={styles.subtle}>
          Gebruik dit scherm tijdens verhoren: links het verdachteprofiel,
          rechts direct wat de teams denken, noteren en kopen.
        </p>

        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <strong>🔍 Kies een verdachte</strong>
          <div style={styles.subtle}>
            Selecteer één verdachte voor focus, of toon alle verhoordossiers
            onder elkaar.
          </div>
        </div>

        <select
          style={styles.select}
          value={selectedInterrogationSuspect}
          onChange={(e) => setSelectedInterrogationSuspect(e.target.value)}
        >
          <option value="">Alle verdachten tonen</option>
          {suspects.map((suspect) => (
            <option key={suspect.id} value={suspect.id}>
              {suspect.name}
            </option>
          ))}
        </select>

        {suspects.length === 0 ? (
          <p style={styles.subtle}>Nog geen verdachten aangemaakt.</p>
        ) : (
          visibleSuspects.map((suspect) => {
            const notesForSuspect = suspectNotes.filter(
              (note) => note.suspect_id === suspect.id
            );
            const statusesForSuspect = suspectStatuses.filter(
              (status) => status.suspect_id === suspect.id
            );
            const boughtCluesForSuspect = groupClues.filter((purchase) => {
              const clue =
                purchase.clues ||
                clues.find((item) => item.id === purchase.clue_id);
              return clue?.suspect_id === suspect.id;
            });

            const suspectCount = statusesForSuspect.filter(
              (item) => item.status === "suspect"
            ).length;
            const doubtCount = statusesForSuspect.filter(
              (item) => item.status === "doubt"
            ).length;
            const excludedCount = statusesForSuspect.filter(
              (item) => item.status === "excluded"
            ).length;
            const latestNotes = [...notesForSuspect]
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(0, 4);

            return (
              <div
                key={suspect.id}
                style={{
                  ...styles.card,
                  background:
                    "linear-gradient(135deg, rgba(153,27,27,0.14), rgba(24,24,27,0.98) 44%, rgba(9,9,11,0.98))",
                  borderColor: "#52525b",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 320px) 1fr",
                    gap: 18,
                    alignItems: "start",
                  }}
                >
                  <div style={styles.card}>
                    {suspect.photo_url ? (
                      <img
                        src={suspect.photo_url}
                        alt={suspect.name}
                        style={{
                          width: "100%",
                          maxHeight: 310,
                          objectFit: "cover",
                          borderRadius: 16,
                          border: "1px solid #52525b",
                          cursor: "pointer",
                          marginBottom: 12,
                        }}
                        onClick={() =>
                          setImageModal({
                            src: suspect.photo_url,
                            alt: suspect.name,
                          })
                        }
                      />
                    ) : (
                      <div
                        style={{
                          height: 230,
                          borderRadius: 16,
                          border: "1px solid #52525b",
                          background: "#09090b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 48,
                          marginBottom: 12,
                        }}
                      >
                        🕵️
                      </div>
                    )}

                    <span style={styles.badge}>
                      {suspect.is_active ? "Actief" : "Inactief"}
                    </span>
                    <h3 style={{ fontSize: 28, margin: "12px 0 8px" }}>
                      {suspect.name}
                    </h3>
                    {suspect.description && (
                      <p style={styles.subtle}>{suspect.description}</p>
                    )}
                  </div>

                  <div>
                    <div style={styles.grid}>
                      <div style={{ ...styles.card, borderColor: "#ef4444" }}>
                        <strong>Verdacht</strong>
                        <div style={styles.statNumber}>{suspectCount}</div>
                      </div>
                      <div style={{ ...styles.card, borderColor: "#f59e0b" }}>
                        <strong>Twijfel</strong>
                        <div style={styles.statNumber}>{doubtCount}</div>
                      </div>
                      <div style={{ ...styles.card, borderColor: "#22c55e" }}>
                        <strong>Uitgesloten</strong>
                        <div style={styles.statNumber}>{excludedCount}</div>
                      </div>
                      <div style={styles.card}>
                        <strong>Notities</strong>
                        <div style={styles.statNumber}>
                          {notesForSuspect.length}
                        </div>
                      </div>
                    </div>

                    <div style={styles.grid}>
                      <div style={styles.card}>
                        <h3>Status per groep</h3>
                        {groups.length === 0 ? (
                          <p style={styles.subtle}>Nog geen groepen.</p>
                        ) : (
                          groups.map((group) => {
                            const statusRecord = statusesForSuspect.find(
                              (item) => item.group_id === group.id
                            );
                            return (
                              <div
                                key={group.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  borderBottom: "1px solid #27272a",
                                  padding: "8px 0",
                                }}
                              >
                                <strong>{group.name}</strong>
                                {StatusBadge({
                                  status: statusRecord?.status || "unknown",
                                })}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div style={styles.card}>
                        <h3>Laatste notities</h3>
                        {latestNotes.length === 0 ? (
                          <p style={styles.subtle}>
                            Nog geen notities over deze verdachte.
                          </p>
                        ) : (
                          latestNotes.map((note) => (
                            <div
                              key={note.id}
                              style={{
                                background: "#09090b",
                                border: "1px solid #27272a",
                                borderRadius: 14,
                                padding: 12,
                                marginBottom: 10,
                              }}
                            >
                              <div style={{ whiteSpace: "pre-wrap" }}>
                                {note.note}
                              </div>
                              <div style={styles.subtle}>
                                📁{" "}
                                {note.groups?.name ||
                                  groups.find(
                                    (group) => group.id === note.group_id
                                  )?.name ||
                                  "Onbekende groep"}{" "}
                                · {formatDate(note.created_at)}
                              </div>
                              <div style={{ marginTop: 8 }}>
                                <button
                                  style={styles.buttonSecondary}
                                  onClick={() => startEditNote(note)}
                                >
                                  Bewerken
                                </button>
                                <button
                                  style={styles.buttonDanger}
                                  onClick={() => deleteNote(note)}
                                >
                                  Verwijderen
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div style={styles.card}>
                        <h3>Aanwijzingen gekocht over deze verdachte</h3>
                        {boughtCluesForSuspect.length === 0 ? (
                          <p style={styles.subtle}>
                            Nog geen groep heeft aanwijzingen rond deze
                            verdachte gekocht.
                          </p>
                        ) : (
                          boughtCluesForSuspect.map((purchase) => {
                            const clue =
                              purchase.clues ||
                              clues.find(
                                (item) => item.id === purchase.clue_id
                              );
                            return (
                              <div key={purchase.id} style={styles.card}>
                                <strong>
                                  {clue?.title || "Onbekende aanwijzing"}
                                </strong>
                                <div>
                                  <span style={styles.badge}>
                                    {purchase.groups?.name || "Onbekende groep"}
                                  </span>
                                  {clue?.price !== undefined && (
                                    <span style={styles.badge}>
                                      💰 {clue.price}
                                    </span>
                                  )}
                                </div>
                                {purchase.purchased_at && (
                                  <div style={styles.subtle}>
                                    Gekocht op:{" "}
                                    {formatDate(purchase.purchased_at)}
                                  </div>
                                )}
                                {clue?.file_url && (
                                  <div style={{ marginTop: 8 }}>
                                    <a
                                      href={clue.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={styles.link}
                                    >
                                      Bestand openen
                                    </a>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const SuspectDashboard = () => (
    <SuspectDashboardPanel ctx={getComponentContext()} />
  );
  const LandingPage = () => {
    const landingFont = '"CoreDodam", Arial, sans-serif';
    const instagramUrl =
      "https://www.instagram.com/csi.hit.alphen?igsh=azU3OThvcjI4YXF3";

    return (
      <>
        <style>{`
          @font-face {
            font-family: "CoreDodam";
            src: url("/fonts/CoreDodam.woff2") format("woff2");
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
        `}</style>

        <div
          style={{
            minHeight: "100vh",
            background:
              "radial-gradient(circle at top, #2a1b1b 0%, #0f0f10 44%, #050505 100%)",
            color: "#f4f4f5",
            padding: 18,
            fontFamily: "Arial, sans-serif",
          }}
        >
          <main
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              padding: "34px 0 22px",
            }}
          >
            <section
              style={{
                background:
                  "linear-gradient(180deg, rgba(24,24,27,0.94), rgba(18,18,20,0.92))",
                border: "1px solid #3f3f46",
                borderRadius: 32,
                padding: "38px 22px",
                textAlign: "center",
                boxShadow: "0 30px 100px rgba(0,0,0,0.48)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 500,
                  margin: "0 auto 22px",
                  overflow: "hidden",
                }}
              >
                <img
                  src="/csi-hit-logo.jpg"
                  alt="CSI HIT Alphen logo"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                    filter: "drop-shadow(0 20px 34px rgba(0,0,0,0.52))",
                  }}
                />
              </div>

              <div
                style={{
                  fontFamily: landingFont,
                  letterSpacing: 1.8,
                  color: "#fca5a5",
                  fontSize: "clamp(16px, 3vw, 22px)",
                  marginBottom: 20,
                }}
              >
                Camping Meijenzorgh editie
              </div>

              <p
                style={{
                  fontFamily: landingFont,
                  fontSize: "clamp(30px, 6vw, 58px)",
                  lineHeight: 1.06,
                  margin: "0 auto 26px",
                  maxWidth: 900,
                  letterSpacing: 1.5,
                  color: "#ffffff",
                  textShadow: "0 10px 30px rgba(0,0,0,0.55)",
                }}
              >
                Los de zaak op voordat de tijd om is.
              </p>

              <p
                style={{
                  maxWidth: 820,
                  margin: "0 auto 28px",
                  color: "#e4e4e7",
                  fontSize: 19,
                  lineHeight: 1.72,
                }}
              >
                Een weekend vol sporen, verklaringen, verdachte details en
                slimme misleiding. Teams verzamelen aanwijzingen, verdienen
                pegels en bouwen stap voor stap hun theorie op.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <a
                  href="https://app.csi-hit.nl"
                  style={{
                    display: "inline-block",
                    padding: "14px 22px",
                    borderRadius: 999,
                    background: "#991b1b",
                    border: "1px solid #ef4444",
                    color: "#fff",
                    textDecoration: "none",
                    fontFamily: landingFont,
                    fontSize: 23,
                    letterSpacing: 1,
                    boxShadow: "0 12px 28px rgba(153,27,27,0.28)",
                  }}
                >
                  Naar de app
                </a>

                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "14px 22px",
                    borderRadius: 999,
                    background: "#27272a",
                    border: "1px solid #52525b",
                    color: "#fff",
                    textDecoration: "none",
                    fontFamily: landingFont,
                    fontSize: 23,
                    letterSpacing: 1,
                  }}
                >
                  Instagram
                </a>
              </div>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  background: "rgba(24,24,27,0.96)",
                  border: "1px solid #3f3f46",
                  borderRadius: 24,
                  padding: 22,
                }}
              >
                <h2
                  style={{
                    fontFamily: landingFont,
                    fontSize: 34,
                    margin: "0 0 12px",
                    letterSpacing: 1,
                  }}
                >
                  Wat is CSI HIT?
                </h2>
                <p style={{ color: "#d4d4d8", lineHeight: 1.7, margin: 0 }}>
                  CSI HIT is een real-life detectivegame waarin groepjes een
                  weekend lang een moordzaak onderzoeken. Door te speuren,
                  vragen te stellen en aanwijzingen slim te combineren, komen ze
                  steeds dichter bij de waarheid.
                </p>
              </div>

              <div
                style={{
                  background: "rgba(24,24,27,0.96)",
                  border: "1px solid #3f3f46",
                  borderRadius: 24,
                  padding: 22,
                }}
              >
                <h2
                  style={{
                    fontFamily: landingFont,
                    fontSize: 34,
                    margin: "0 0 12px",
                    letterSpacing: 1,
                  }}
                >
                  Deelnemersinformatie
                </h2>
                <p style={{ color: "#d4d4d8", lineHeight: 1.7, margin: 0 }}>
                  Deelnemers gebruiken de app om agenda-items te bekijken,
                  pegels te verdienen, aanwijzingen te kopen, verdachten te
                  beoordelen en hun theorie stap voor stap vast te leggen.
                </p>
              </div>

              <div
                style={{
                  background: "rgba(24,24,27,0.96)",
                  border: "1px solid #3f3f46",
                  borderRadius: 24,
                  padding: 22,
                }}
              >
                <h2
                  style={{
                    fontFamily: landingFont,
                    fontSize: 34,
                    margin: "0 0 12px",
                    letterSpacing: 1,
                  }}
                >
                  Volg CSI HIT
                </h2>
                <p style={{ color: "#d4d4d8", lineHeight: 1.7 }}>
                  Bekijk updates, sfeerbeelden en kleine hints via Instagram.
                </p>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#fca5a5",
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                >
                  @csi.hit.alphen
                </a>
              </div>
            </section>

            <footer
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                color: "#a1a1aa",
                fontSize: 14,
                marginTop: 20,
                padding: "0 6px",
              }}
            >
              <span>CSI HIT Alphen</span>
              <a
                href="https://app.csi-hit.nl"
                style={{ color: "#a1a1aa", textDecoration: "none" }}
              >
                Organisatie login
              </a>
            </footer>
          </main>
        </div>
      </>
    );
  };
  const LoginScreen = () => (
    <div style={styles.app}>
      <div style={{ ...styles.card, maxWidth: 520, margin: "40px auto" }}>
        <h1>CSI HIT Login</h1>
        <input
          style={styles.input}
          placeholder="Naam, alleen nodig bij registreren"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button style={styles.button} onClick={handleLogin}>
          Inloggen
        </button>
        <button style={styles.buttonSecondary} onClick={handleRegister}>
          Registreren
        </button>
        {MessageBlock()}
      </div>
    </div>
  );

  if (isLandingDomain) {
    return LandingPage();
  }

  if (!session || !profile) {
    return LoginScreen();
  }

  if (profile.role === "suspect") {
    return SuspectDashboard();
  }

  if (profile.role === "admin") {
    return (
      <div style={styles.app} {...appFocusHandlers}>
        <div style={styles.shell}>
          {Header({
            title: "CSI HIT Control Room",
            subtitle: `Ingelogd als ${profile.display_name || profile.email}`,
          })}

          {LoadingBlock()}

          <ErrorBoundary key={activeAdminTab}>
            {activeAdminTab === "dashboard" && AdminDashboard()}

            {activeAdminTab === "setup" && AdminSetupCheck()}

            {activeAdminTab === "groups" && AdminGroupsList()}

            {activeAdminTab === "manage" && (
              <>
                {AdminManage()}
                {AgendaBlock()}
              </>
            )}

            {activeAdminTab === "clues" && AdminClues()}

            {activeAdminTab === "preview" && AdminParticipantPreview()}

            {activeAdminTab === "credits" && AdminCreditsAndNotifications()}

            {ENABLE_FINAL_REPORTS &&
              activeAdminTab === "final" &&
              AdminFinalReports()}

            {activeAdminTab === "interrogation" && AdminInterrogationPanel()}
          </ErrorBoundary>

          {MessageBlock()}
          {ImageModal()}
        </div>

        <div style={styles.adminMobileNav}>
          <button
            style={styles.navButton(activeAdminTab === "dashboard")}
            onClick={() => setActiveAdminTab("dashboard")}
          >
            📊
            <br />
            Dash
          </button>

          <button
            style={styles.navButton(activeAdminTab === "setup")}
            onClick={() => setActiveAdminTab("setup")}
          >
            ✅
            <br />
            Klaar
          </button>

          <button
            style={styles.navButton(activeAdminTab === "groups")}
            onClick={() => setActiveAdminTab("groups")}
          >
            👥
            <br />
            Groepen
          </button>

          <button
            style={styles.navButton(activeAdminTab === "manage")}
            onClick={() => setActiveAdminTab("manage")}
          >
            ⚙️
            <br />
            Beheer
          </button>

          <button
            style={styles.navButton(activeAdminTab === "clues")}
            onClick={() => setActiveAdminTab("clues")}
          >
            📄
            <br />
            Clues
          </button>
          <button
            style={styles.navButton(activeAdminTab === "preview")}
            onClick={() => setActiveAdminTab("preview")}
          >
            👁️
            <br />
            Preview
          </button>
          <button
            style={styles.navButton(activeAdminTab === "credits")}
            onClick={() => setActiveAdminTab("credits")}
          >
            💰
            <br />
            Pegels
          </button>

          {ENABLE_FINAL_REPORTS && (
            <button
              style={styles.navButton(activeAdminTab === "final")}
              onClick={() => setActiveAdminTab("final")}
            >
              🏁
              <br />
              Finale
            </button>
          )}

          <button
            style={styles.navButton(activeAdminTab === "interrogation")}
            onClick={() => setActiveAdminTab("interrogation")}
          >
            🕵️
            <br />
            Verhoor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app} {...appFocusHandlers}>
      <div style={styles.shell}>
        {Header({
          title: "CSI HIT",
          subtitle: `Welkom ${profile.display_name || profile.email}`,
        })}
        {LoadingBlock()}
        <ErrorBoundary key={activeParticipantTab}>
          {!myGroup ? (
            NoGroupScreen()
          ) : (
            <>
              {activeParticipantTab === "dashboard" && ParticipantDashboard()}

              {activeParticipantTab === "agenda" && (
                <>
                  {ParticipantGroupBar()}
                  {AgendaBlock()}
                </>
              )}

              {activeParticipantTab === "clues" && ParticipantClues()}

              {activeParticipantTab === "suspects" && (
                <>
                  {ParticipantGroupBar()}
                  {ParticipantSuspects()}
                </>
              )}

              {activeParticipantTab === "messages" && (
                <>
                  {ParticipantGroupBar()}
                  {NotificationsBlock()}
                  {TransactionsBlock()}
                </>
              )}

              {ENABLE_FINAL_REPORTS &&
                activeParticipantTab === "final" &&
                ParticipantFinalReport()}
            </>
          )}
        </ErrorBoundary>
        {MessageBlock()}
        {ENABLE_FINAL_REPORTS && FinalReportEditorModal()}
        {ImageModal()}
      </div>

      <div style={styles.mobileNav}>
        <button
          style={styles.navButton(activeParticipantTab === "dashboard")}
          onClick={() => setActiveParticipantTab("dashboard")}
        >
          🏠
          <br />
          Home
        </button>

        <button
          style={styles.navButton(activeParticipantTab === "agenda")}
          onClick={() => setActiveParticipantTab("agenda")}
        >
          🗓️
          <br />
          Agenda
        </button>

        <button
          style={styles.navButton(activeParticipantTab === "clues")}
          onClick={() => setActiveParticipantTab("clues")}
        >
          📄
          <br />
          Clues
        </button>

        <button
          style={styles.navButton(activeParticipantTab === "suspects")}
          onClick={() => setActiveParticipantTab("suspects")}
        >
          🕵️
          <br />
          Verdachten
        </button>

        <button
          style={styles.navButton(activeParticipantTab === "messages")}
          onClick={() => setActiveParticipantTab("messages")}
        >
          🔔
          <br />
          Info
        </button>
        {shouldShowParticipantFinalTab() && (
          <button
            style={styles.navButton(activeParticipantTab === "final")}
            onClick={() => setActiveParticipantTab("final")}
          >
            🏁
            <br />
            Finale
          </button>
        )}
      </div>
    </div>
  );
}
