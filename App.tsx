/**
 * LT Vault — offline-first password & secret manager.
 *
 * App.tsx is just the shell: it wires the session state machine
 * (src/session/useVaultSession) to the screens and renders the active one.
 * State, persistence, and all vault actions live in the hook; crypto in
 * src/vaultCrypto, storage in src/vaultStorage, and each screen in
 * src/screens/lara/*. Nothing leaves the device except an encrypted .ltvault.
 *
 * @format
 */

import './src/applyDefaultFont';

import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { lc } from './src/laraTheme';
import { makeItem, categoriesOf } from './src/model';
import { useVaultSession } from './src/session/useVaultSession';
import { LaraTabBar } from './src/components/lara';

import OnboardingScreen from './src/screens/lara/OnboardingScreen';
import UnlockScreen from './src/screens/lara/UnlockScreen';
import VaultListScreen from './src/screens/lara/VaultListScreen';
import GeneratorScreen from './src/screens/lara/GeneratorScreen';
import SettingsScreen from './src/screens/lara/SettingsScreen';
import AutofillScreen from './src/screens/lara/AutofillScreen';
import ItemDetailScreen from './src/screens/lara/ItemDetailScreen';
import ItemEditorScreen from './src/screens/lara/ItemEditorScreen';
import TypePickerScreen from './src/screens/lara/TypePickerScreen';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const {
    screen,
    pass,
    setPass,
    confirm,
    setConfirm,
    error,
    busy,
    vault,
    tab,
    setTab,
    route,
    setRoute,
    showAutofill,
    setShowAutofill,
    importing,
    pendingBlob,
    setPendingBlob,
    restoreInfo,
    restoreError,
    busyExport,
    busySaveFile,
    exportInfo,
    exportError,
    bioAvailable,
    bioEnabled,
    autoLockMinutes,
    handleCreate,
    handleUnlock,
    handleBiometricUnlock,
    handleLock,
    handlePickBackup,
    handleConfirmRestore,
    handleExportShare,
    handleSaveFile,
    handleToggleBiometric,
    handleChangeAutoLock,
    handleChangeMaster,
    toggleFavorite,
    openItem,
    openAdd,
    handleSaveItem,
    handleDeleteItem,
  } = useVaultSession();

  if (screen === 'loading') {
    return (
      <View style={[styles.lightFill, styles.centered]}>
        <ActivityIndicator color={lc.primary} size="large" />
      </View>
    );
  }

  if (screen === 'unlock') {
    return (
      <UnlockScreen
        insetsTop={insets.top}
        insetsBottom={insets.bottom}
        pass={pass}
        setPass={setPass}
        error={error}
        busy={busy}
        onUnlock={() => handleUnlock()}
        bioAvailable={bioAvailable}
        bioEnabled={bioEnabled}
        onBiometricUnlock={handleBiometricUnlock}
        importing={importing}
        onPickBackup={handlePickBackup}
        restoreInfo={restoreInfo}
        restoreError={restoreError}
        pendingRestore={pendingBlob != null}
        onConfirmRestore={handleConfirmRestore}
        onCancelRestore={() => setPendingBlob(null)}
      />
    );
  }

  if (screen === 'create') {
    return (
      <OnboardingScreen
        insetsTop={insets.top}
        insetsBottom={insets.bottom}
        pass={pass}
        confirm={confirm}
        setPass={setPass}
        setConfirm={setConfirm}
        error={error}
        busy={busy}
        onCreate={handleCreate}
        importing={importing}
        onPickBackup={handlePickBackup}
        restoreError={restoreError}
      />
    );
  }

  // Unlocked. A full-screen overlay (detail / editor / type picker / autofill)
  // sits above the tabbed content when active.
  const detailItem =
    route.name === 'detail'
      ? vault.items.find(i => i.id === route.id) ?? null
      : null;

  if (route.name === 'pickType') {
    return (
      <TypePickerScreen
        onPick={t => setRoute({ name: 'editor', item: makeItem(t), isNew: true })}
        onCancel={() => setRoute({ name: 'list' })}
        insetsTop={insets.top}
        insetsBottom={insets.bottom}
      />
    );
  }

  if (route.name === 'editor') {
    const back = route.isNew
      ? () => setRoute({ name: 'list' })
      : () => setRoute({ name: 'detail', id: route.item.id });
    return (
      <ItemEditorScreen
        initial={route.item}
        busy={busy}
        onSave={item => handleSaveItem(item)}
        onCancel={back}
        existingCategories={categoriesOf(vault.items)}
        insetsTop={insets.top}
        insetsBottom={insets.bottom}
      />
    );
  }

  if (route.name === 'detail' && detailItem) {
    return (
      <ItemDetailScreen
        item={detailItem}
        busy={busy}
        onEdit={() => setRoute({ name: 'editor', item: detailItem, isNew: false })}
        onToggleFavorite={() => toggleFavorite(detailItem.id)}
        onDelete={() => handleDeleteItem(detailItem.id)}
        onBack={() => setRoute({ name: 'list' })}
        insetsTop={insets.top}
        insetsBottom={insets.bottom}
      />
    );
  }

  if (showAutofill) {
    return (
      <AutofillScreen
        insetsTop={insets.top}
        insetsBottom={insets.bottom}
        onClose={() => setShowAutofill(false)}
      />
    );
  }

  // Unlocked tabbed shell — every tab on the faithful light theme. Each screen
  // paints its own light background and owns the top inset.
  return (
    <View style={styles.lightFill}>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
      <View style={styles.content}>
        {tab === 'vault' && (
          <VaultListScreen
            items={vault.items}
            onOpenItem={openItem}
            onAddItem={openAdd}
            insetsTop={insets.top}
          />
        )}
        {tab === 'generate' && <GeneratorScreen insetsTop={insets.top} />}
        {tab === 'settings' && (
          <SettingsScreen
            itemCount={vault.items.length}
            biometricAvailable={bioAvailable}
            biometricEnabled={bioEnabled}
            onToggleBiometric={handleToggleBiometric}
            autoLockMinutes={autoLockMinutes}
            onChangeAutoLock={handleChangeAutoLock}
            onExportShare={handleExportShare}
            onSaveFile={handleSaveFile}
            busyExport={busyExport}
            busySaveFile={busySaveFile}
            exportInfo={exportInfo}
            exportError={exportError}
            onChangeMaster={handleChangeMaster}
            onLock={handleLock}
            onOpenAutofill={() => setShowAutofill(true)}
            insetsTop={insets.top}
          />
        )}
      </View>
      <LaraTabBar active={tab} onChange={setTab} insetsBottom={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  lightFill: { flex: 1, backgroundColor: lc.appBg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
});

export default App;
