/**
 * The Studio — the refinery (ADR-0038).
 *
 * A picked design goes from *almost* to *yes* here, in three ranked gears:
 *
 *   1. Point and say — the default surface. Circle the part that's wrong, say
 *      what's wrong, SketchBot redraws only that region. No tool vocabulary.
 *   2. Plain-language tools — one tap deeper: redraw area, erase, resize part,
 *      undo. The same capabilities in words instead of jargon.
 *   3. The full bench — behind an explicit door: layers, blend modes, version
 *      timeline and compare, element regeneration, stencil export, cleanup.
 *      Desktop-only, and honest about it.
 *
 * What the Studio no longer holds: the prompt box, vibe chips, and body-part
 * selector. `/design` is the one door and owns intake (ADR-0028); the
 * components survive in the tree for that surface.
 *
 * Fixes are bounded per design (`studio-fix-allowance`), drawn from the same
 * global budget as every other render, and the ceiling ends in a booking
 * prompt rather than a paywall.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ForgeCanvas } from './generate/components/ForgeCanvas';
import AdvancedOptions from '../components/generate/AdvancedOptions';
import LayerStack from '../components/generate/LayerStack';
import MatchPulseSidebar from './generate/components/MatchPulseSidebar';
import KeyboardShortcutsModal, { useKeyboardShortcuts } from '../components/KeyboardShortcutsModal';
import BlendModeSelector from '../components/generate/BlendModeSelector';
import ErrorBoundary from '../components/ErrorBoundary';
import StencilExport from './stencil/components/StencilExport';
import InpaintingEditor from './inpainting/components/InpaintingEditor';
import CleanupTool from '../components/generate/CleanupTool';
import VersionTimeline from './generate/components/VersionTimeline';
import VersionComparison from './generate/components/VersionComparison';
import LayerContextMenu from '../components/generate/LayerContextMenu';
import RegenerateElementModal from '../components/generate/RegenerateElementModal';
import PointAndSay from './generate/components/PointAndSay';
import PlainToolsRow from './generate/components/PlainToolsRow';
import FullBench from './generate/components/FullBench';
import { ToastContainer } from '../components/ui/Toast';
import { DEFAULT_BODY_PART } from '../constants/bodyPartAspectRatios';
import { useLayerManagement } from './generate/hooks/useLayerManagement';
import { useRealtimeMatchPulse } from './match-pulse/hooks/useRealtimeMatchPulse';
import { useCanvasAspectRatio } from '../hooks/useCanvasAspectRatio';
import { useVersionHistory } from './generate/hooks/useVersionHistory';
import { useRefinement } from './generate/hooks/useRefinement';
import { useToast } from '../hooks/useToast';
import { useStorageWarning } from '../hooks/useStorageWarning';
import * as versionService from './generate/services/versionService';
import Button from '../components/ui/Button';
import { Wand2, Download, Sparkles, Plus, Eraser } from 'lucide-react';
import { useImageGeneration } from './generate/hooks/useImageGeneration';
import { normalizeStyleKey } from '../config/promptTemplates';
import TransformControls from '../components/generate/TransformControls';
import { useTransformShortcuts } from '../hooks/useTransformShortcuts';
import { exportAsPNG, exportAsARAsset } from './generate/services/canvasService';
import { convertToStencil } from './stencil/services/stencilService';
import { readPickedDesign, readPickedDesignId } from './generate/services/pickedDesign';
import { NO_DESIGN_LINE } from './generate/services/refineryVoice';
import { useForgeStore } from '../store/useForgeStore';
import { useDesigns } from '../lib/tattStorage';
import {
    processGenerationResult,
    addMultipleLayers,
    shouldUseMultiLayer
} from './generate/services/multiLayerService';

export default function Generate({ design = null }) {
    // The Studio is entered from a picked design, resolved in three steps:
    // the prop, then the `?design=` id the /studio route carries against the
    // saved-designs library, then the sessionStorage seam for entry points
    // that can only hand a design over that way.
    // Client-only surface (loaded with ssr:false), so the stash can be read
    // once during the first render rather than through an effect.
    const { designs, hydrated } = useDesigns();
    const [stashed] = useState(() => readPickedDesign());

    const picked = useMemo(() => {
        if (design) return design;

        const id = readPickedDesignId();
        const saved = id && hydrated ? designs.find((entry) => entry.id === id) : null;
        if (saved?.image) {
            return {
                id: saved.id,
                imageUrl: saved.image,
                prompt: saved.prompt,
                style: undefined,
                bodyPart: undefined
            };
        }

        return stashed;
    }, [design, designs, hydrated, stashed]);

    const bodyPart = picked?.bodyPart || DEFAULT_BODY_PART;
    const promptText = picked?.prompt || '';
    const matchStyle = picked?.style || 'Traditional';
    const normalizedStyle = normalizeStyleKey(matchStyle) || 'traditional';

    // Bench-only generation parameters. No prompt box lives here any more —
    // these only shape element regeneration and restyle (gear 3).
    const [size, setSize] = useState('medium');
    const [aiModel, setAiModel] = useState('tattoo');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [enhancementLevel, setEnhancementLevel] = useState('detailed');
    const [separateRGBA, setSeparateRGBA] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [sessionId, setSessionId] = useState(() => {
        if (typeof sessionStorage === 'undefined') return 'session_studio';
        const stored = sessionStorage.getItem('tattester_session_id');
        if (stored) return stored;
        const created = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem('tattester_session_id', created);
        return created;
    });

    const {
        versions,
        currentVersionId,
        addVersion,
        loadVersion,
        removeVersion,
        clearHistory
    } = useVersionHistory(sessionId);

    const {
        layers,
        sortedLayers,
        selectedLayerId,
        addLayer,
        deleteLayer,
        reorder,
        toggleVisibility,
        rename,
        selectLayer,
        updateTransform,
        flipHorizontal,
        flipVertical,
        replaceLayers,
        updateImage,
        updateBlendMode,
        duplicateLayer,
        undo,
        redo
    } = useLayerManagement();

    const { toast, toasts, removeToast } = useToast();
    useStorageWarning(toast);

    const generationInput = useMemo(() => ({
        subject: promptText,
        style: normalizedStyle,
        bodyPart,
        size,
        aiModel,
        negativePrompt
    }), [promptText, normalizedStyle, bodyPart, size, aiModel, negativePrompt]);

    const {
        generateHighRes,
        isGenerating,
        error: generationError,
        arAsset
    } = useImageGeneration({ userInput: generationInput });

    // Bench UI state
    const [showInpainting, setShowInpainting] = useState(false);
    const [showCleanup, setShowCleanup] = useState(false);
    const [restyleLayerId, setRestyleLayerId] = useState(null);
    const [restyleStyle, setRestyleStyle] = useState('');
    const [comparison, setComparison] = useState(null);
    const [showElementModal, setShowElementModal] = useState(false);
    const [elementPrompt, setElementPrompt] = useState('');
    const [elementType, setElementType] = useState('subject');
    const [contextMenu, setContextMenu] = useState(null);
    const [regenerateModal, setRegenerateModal] = useState(null);
    const [toolSeed, setToolSeed] = useState(null);

    const keyboardShortcuts = useKeyboardShortcuts();
    const [stencilView, setStencilView] = useState(false);
    const [stencilPreview, setStencilPreview] = useState(null);
    const [isStencilProcessing, setIsStencilProcessing] = useState(false);
    const [stencilError, setStencilError] = useState(null);
    const [stencilSourceUrl, setStencilSourceUrl] = useState(null);
    const [showStencilExport, setShowStencilExport] = useState(false);

    const { width: canvasWidth, height: canvasHeight } = useCanvasAspectRatio(bodyPart);

    const selectedLayer = useMemo(() => (
        layers.find(layer => layer.id === selectedLayerId) || null
    ), [layers, selectedLayerId]);

    const matchContext = useMemo(() => ({
        style: matchStyle,
        bodyPart,
        layerCount: layers.length,
        location: null,
        embeddingVector: null
    }), [bodyPart, layers.length, matchStyle]);

    const currentDesign = useMemo(() => ({
        id: sessionId,
        prompt: promptText,
        style: matchStyle,
        bodyPart,
        imageUrl: layers[layers.length - 1]?.imageUrl || null,
        location: null,
        budget: null,
        embeddingVector: null
    }), [sessionId, promptText, matchStyle, bodyPart, layers]);

    const {
        matches,
        totalMatches,
        isLoading: isMatching,
        error: matchError
    } = useRealtimeMatchPulse({
        userId: sessionId,
        context: matchContext,
        currentDesign,
        debounceMs: 2000
    });

    const historyPastCount = useForgeStore((state) => state.history.past.length);
    const historyFutureCount = useForgeStore((state) => state.history.future.length);

    const timeline = useMemo(() => (
        versionService.getVersionTimeline(sessionId)
    ), [sessionId, versions]);

    const buildVersionPayload = useCallback((overrides = {}) => {
        const resolvedLayers = overrides.layers || sortedLayers;
        return {
            prompt: promptText,
            enhancedPrompt: null,
            parameters: {
                size,
                aiModel,
                negativePrompt,
                enhancementLevel,
                bodyPart
            },
            layers: resolvedLayers,
            imageUrl: overrides.imageUrl || resolvedLayers[resolvedLayers.length - 1]?.imageUrl || null,
            arAssetUrl: overrides.arAssetUrl || arAsset?.url || null,
            stencilUrl: null,
            metadata: {
                bodyPart,
                style: matchStyle,
                generationMode: overrides.mode || null,
                dpi: overrides.dpi || 300
            }
        };
    }, [
        arAsset,
        bodyPart,
        enhancementLevel,
        matchStyle,
        negativePrompt,
        promptText,
        size,
        aiModel,
        sortedLayers
    ]);

    // Seed the canvas with the picked design exactly once — this is the whole
    // entry contract: the Studio always opens on something already chosen.
    const [seeded, setSeeded] = useState(false);
    useEffect(() => {
        if (seeded || !picked?.imageUrl || layers.length > 0) return;
        let cancelled = false;
        (async () => {
            const layer = await addLayer(picked.imageUrl, 'subject');
            if (cancelled) return;
            setSeeded(true);
            addVersion(buildVersionPayload({
                layers: [layer],
                imageUrl: picked.imageUrl,
                mode: 'picked'
            }));
        })();
        return () => { cancelled = true; };
        // buildVersionPayload changes with every layer edit; seeding must not
        // re-run for that.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addLayer, addVersion, layers.length, picked, seeded]);

    useTransformShortcuts({
        selectedLayerId,
        layers,
        updateTransform,
        deleteLayer,
        duplicateLayer,
        undo,
        redo
    });

    // ---- Gear 1 / gear 2: the refinement loop ----------------------------

    // The layer a fix lands on: whatever is selected, else the base layer.
    const refineTargetId = selectedLayerId || sortedLayers[0]?.id || null;
    const refineTarget = useMemo(() => (
        layers.find(layer => layer.id === refineTargetId) || null
    ), [layers, refineTargetId]);
    const refineImageUrl = refineTarget?.imageUrl || picked?.imageUrl || null;

    const applyRefinement = useCallback((imageUrl) => {
        if (!imageUrl) return;
        if (refineTargetId) {
            updateImage(refineTargetId, imageUrl);
            const nextLayers = layers.map(layer => (
                layer.id === refineTargetId ? { ...layer, imageUrl } : layer
            ));
            addVersion(buildVersionPayload({
                layers: nextLayers,
                imageUrl,
                mode: 'fix'
            }));
        }
    }, [addVersion, buildVersionPayload, layers, refineTargetId, updateImage]);

    const refinement = useRefinement({
        designId: picked?.id || sessionId,
        imageUrl: refineImageUrl,
        onApply: applyRefinement
    });

    // ---- Gear 3: the bench ------------------------------------------------

    const createStencilSource = async () => {
        const compositeBlob = await exportAsPNG(sortedLayers, canvasWidth, canvasHeight, 1.0);
        const compositeUrl = URL.createObjectURL(compositeBlob);
        if (stencilSourceUrl) {
            URL.revokeObjectURL(stencilSourceUrl);
        }
        setStencilSourceUrl(compositeUrl);
        return compositeUrl;
    };

    const handleToggleStencil = async () => {
        if (!stencilView) {
            setIsStencilProcessing(true);
            setStencilError(null);
            try {
                const compositeUrl = await createStencilSource();
                const stencil = await convertToStencil(compositeUrl, { invert: true });
                setStencilPreview(stencil);
            } catch (error) {
                console.error('Stencil generation failed:', error);
                setStencilError('Failed to generate stencil preview.');
            } finally {
                setIsStencilProcessing(false);
            }
        }
        setStencilView(!stencilView);
    };

    useEffect(() => {
        return () => {
            if (stencilSourceUrl) {
                URL.revokeObjectURL(stencilSourceUrl);
            }
        };
    }, [stencilSourceUrl]);

    const handleExportPNG = async () => {
        try {
            const blob = await exportAsPNG(sortedLayers, canvasWidth, canvasHeight);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tattoo-design-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            toast?.error?.('Failed to export design. Please try again.');
        }
    };

    const handleExportARAsset = async () => {
        try {
            const blob = await exportAsARAsset(sortedLayers, canvasWidth, canvasHeight);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tattoo-ar-asset-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('AR export failed:', error);
            toast?.error?.('Failed to export AR asset. Please try again.');
        }
    };

    const handleLoadVersion = (versionId) => {
        const version = loadVersion(versionId);
        if (!version) return;
        replaceLayers(version.layers || []);
        if (version.parameters?.size) setSize(version.parameters.size);
        if (version.parameters?.aiModel) setAiModel(version.parameters.aiModel);
        if (version.parameters?.negativePrompt !== undefined) {
            setNegativePrompt(version.parameters.negativePrompt || '');
        }
        if (version.parameters?.enhancementLevel) setEnhancementLevel(version.parameters.enhancementLevel);
    };

    const handleBranchVersion = (versionId) => {
        const branch = versionService.branchFromVersion(sessionId, versionId);
        if (!branch) return;
        sessionStorage.setItem('tattester_session_id', branch.sessionId);
        setSessionId(branch.sessionId);
        replaceLayers(branch.version.layers || []);
    };

    const handleCompareVersions = ({ first, second }) => {
        const compare = versionService.compareVersions(sessionId, first, second);
        if (compare) {
            setComparison({ versionA: compare.version1, versionB: compare.version2 });
        }
    };

    const handleMergeVersions = (versionA, versionB) => {
        const layersFromVersion1 = (versionA.layers || []).map((_, idx) => idx);
        const layersFromVersion2 = (versionB.layers || []).map((_, idx) => idx);

        const merged = versionService.mergeVersions(sessionId, versionA.id, versionB.id, {
            layersFromVersion1,
            layersFromVersion2,
            prompt: versionA.prompt || promptText,
            parameters: versionA.parameters || { bodyPart, size, aiModel }
        });

        if (merged) {
            replaceLayers(merged.layers || []);
            setComparison(null);
            toast?.success?.(`Merged v${versionA.versionNumber} and v${versionB.versionNumber} into new version`);
        }
    };

    const handleRestyle = async () => {
        if (!restyleLayerId || !restyleStyle.trim()) return;

        const restylePrompt = [promptText, restyleStyle].filter(Boolean).join(', ');

        try {
            const response = await generateHighRes({
                userInputOverride: {
                    subject: restylePrompt,
                    style: restyleStyle,
                    bodyPart,
                    size,
                    aiModel,
                    negativePrompt
                }
            });

            if (response?.images?.length > 0) {
                updateImage(restyleLayerId, response.images[0]);
                const nextLayers = layers.map(layer =>
                    layer.id === restyleLayerId ? { ...layer, imageUrl: response.images[0] } : layer
                );
                addVersion(buildVersionPayload({
                    layers: nextLayers,
                    imageUrl: response.images[0],
                    arAssetUrl: arAsset?.url || null
                }));
            }
        } catch (error) {
            console.error('[Studio] Restyle failed:', error);
        } finally {
            setRestyleLayerId(null);
            setRestyleStyle('');
        }
    };

    const handleAddElement = async () => {
        if (!elementPrompt.trim()) return;

        try {
            const response = await generateHighRes({
                userInputOverride: {
                    subject: elementPrompt,
                    style: normalizedStyle,
                    bodyPart,
                    size,
                    aiModel,
                    negativePrompt
                }
            });

            if (response?.images?.length > 0) {
                let createdLayers = [];

                if (shouldUseMultiLayer(response)) {
                    const layerSpecs = await processGenerationResult(response, {
                        separateAlpha: separateRGBA,
                        autoDetectAlpha: true
                    });
                    layerSpecs.forEach(spec => {
                        spec.type = elementType;
                    });
                    createdLayers = await addMultipleLayers(layerSpecs, addLayer);
                } else {
                    const newLayer = await addLayer(response.images[0], elementType);
                    createdLayers = [newLayer];
                }

                const nextLayers = [...layers, ...createdLayers];
                addVersion(buildVersionPayload({
                    layers: nextLayers,
                    imageUrl: createdLayers[createdLayers.length - 1]?.imageUrl || response.images[0],
                    mode: 'element'
                }));
            }
        } catch (error) {
            console.error('[Studio] Add element failed:', error);
        } finally {
            setShowElementModal(false);
            setElementPrompt('');
            setElementType('subject');
        }
    };

    const handleInpaintSave = (imageUrl) => {
        if (!selectedLayerId || !imageUrl) return;
        updateImage(selectedLayerId, imageUrl);
        const nextLayers = layers.map(layer =>
            layer.id === selectedLayerId ? { ...layer, imageUrl } : layer
        );
        addVersion(buildVersionPayload({ layers: nextLayers, imageUrl }));
        setShowInpainting(false);
    };

    const handleCleanupSave = (imageUrl) => {
        if (!selectedLayerId || !imageUrl) return;
        updateImage(selectedLayerId, imageUrl);
        const nextLayers = layers.map(layer =>
            layer.id === selectedLayerId ? { ...layer, imageUrl } : layer
        );
        addVersion(buildVersionPayload({ layers: nextLayers, imageUrl, mode: 'cleanup' }));
        setShowCleanup(false);
        toast?.success?.('Layer cleaned up successfully');
    };

    const handleLayerContextMenu = (layer, x, y) => {
        setContextMenu({ layer, x, y });
    };

    const handleDuplicateLayer = async (layer) => {
        const newLayer = await addLayer(layer.imageUrl, layer.type);
        const nextLayers = [...layers, newLayer];
        addVersion(buildVersionPayload({ layers: nextLayers, imageUrl: newLayer.imageUrl }));
        toast?.success?.(`Duplicated layer: ${layer.name}`);
    };

    const handleRegenerateElementSubmit = async (data) => {
        try {
            const response = await generateHighRes({
                userInputOverride: {
                    subject: data.prompt,
                    style: data.useOriginalStyle ? normalizedStyle : 'default',
                    bodyPart,
                    size,
                    aiModel,
                    negativePrompt
                }
            });

            if (response?.images?.[0]) {
                updateImage(data.layerId, response.images[0]);
                const nextLayers = layers.map(layer =>
                    layer.id === data.layerId ? { ...layer, imageUrl: response.images[0] } : layer
                );
                addVersion(buildVersionPayload({
                    layers: nextLayers,
                    imageUrl: response.images[0],
                    mode: 'regenerate'
                }));
                setRegenerateModal(null);
                toast?.success?.('Element regenerated successfully');
            }
        } catch (error) {
            console.error('[Studio] Regenerate failed:', error);
            toast?.error?.('Failed to regenerate element');
        }
    };

    // ---- Render -----------------------------------------------------------

    // Entered cold: say so and point back at the one door, rather than
    // pretending the refinery has something on the bench.
    if (!refineImageUrl) {
        return (
            <div className="min-h-screen pt-8 px-6 md:px-12 pb-24 text-white font-body">
                <div className="max-w-xl mx-auto space-y-6">
                    <h1 className="font-display text-[40px] md:text-[64px] leading-[0.9] uppercase">
                        the&nbsp;<span className="slash"><span>studio</span></span><span className="text-pink">.</span>
                    </h1>
                    <p data-testid="studio-empty" className="text-[15px] text-white/70 leading-[1.55]">
                        {NO_DESIGN_LINE}
                    </p>
                    <Link
                        href="/design"
                        className="press inline-flex min-h-[44px] items-center justify-center px-6 bg-pink text-black font-display uppercase text-[14px] tracking-[0.2em]"
                    >
                        start a design
                    </Link>
                </div>
                <ToastContainer toasts={toasts} removeToast={removeToast} />
            </div>
        );
    }

    return (
        // Texture (halftone + grain) and the black base come from StudioShell.
        <div className="min-h-screen pt-8 px-4 sm:px-6 md:px-12 pb-24 text-white font-body">
            <div className="max-w-[1560px] mx-auto space-y-8">
                <header role="banner">
                    <h1 className="rise rise-1 font-display text-white leading-[0.88] tracking-[0.005em] text-[40px] md:text-[72px]">
                        THE&nbsp;<span className="slash"><span>STUDIO</span></span><span className="text-pink">.</span>
                    </h1>
                    <p className="rise rise-2 mt-3 text-[10px] font-body text-pink uppercase tracking-[0.3em]">
                        <span className="text-pink">●</span>&nbsp;&nbsp;the last ten percent
                    </p>
                </header>

                {/* Gear 1 — the default surface. */}
                <PointAndSay
                    imageUrl={refineImageUrl}
                    refinement={refinement}
                    seed={toolSeed}
                />

                {/* Gear 2 — one tap deeper, never crowding gear 1. */}
                <PlainToolsRow
                    onSeed={setToolSeed}
                    onUndo={undo}
                    canUndo={historyPastCount > 0}
                    disabled={refinement.status === 'working'}
                />

                {/* Gear 3 — the full bench, behind its explicit door. */}
                <FullBench>
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                        <div className="xl:col-span-8 space-y-6">
                            <div className="bg-black border-2 hairline p-6">
                                <div className="relative group">
                                    <ForgeCanvas
                                        bodyPart={bodyPart}
                                        layers={sortedLayers}
                                        selectedLayerId={selectedLayerId}
                                        onSelectLayer={selectLayer}
                                        onUpdateTransform={updateTransform}
                                    />

                                    {stencilView && stencilPreview && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={stencilPreview}
                                            alt="Stencil preview"
                                            className="absolute inset-0 w-full h-full object-contain mix-blend-screen pointer-events-none"
                                        />
                                    )}

                                    {selectedLayerId && (
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2">
                                            <TransformControls
                                                onFlipHorizontal={() => flipHorizontal(selectedLayerId)}
                                                onFlipVertical={() => flipVertical(selectedLayerId)}
                                                onResetRotation={() => updateTransform(selectedLayerId, { rotation: 0 })}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <Button
                                        variant="primary"
                                        size="md"
                                        onClick={handleToggleStencil}
                                        disabled={isStencilProcessing}
                                        aria-label="Toggle stencil view"
                                    >
                                        {stencilView ? 'Exit Stencil View' : 'Stencil View'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="md"
                                        onClick={async () => {
                                            if (!stencilSourceUrl) {
                                                await createStencilSource();
                                            }
                                            setShowStencilExport(true);
                                        }}
                                        aria-label="Export stencil"
                                    >
                                        Export Stencil
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={undo}
                                        disabled={historyPastCount === 0}
                                        aria-label="Undo"
                                    >
                                        Undo
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={redo}
                                        disabled={historyFutureCount === 0}
                                        aria-label="Redo"
                                    >
                                        Redo
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleExportARAsset}
                                        aria-label="Export AR asset"
                                    >
                                        AR Asset
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={clearHistory}
                                        disabled={historyPastCount === 0 && historyFutureCount === 0}
                                        className="text-[10px] font-body uppercase tracking-[0.2em] text-white/40 hover:text-pink disabled:opacity-40"
                                    >
                                        Clear History
                                    </button>
                                    {isStencilProcessing && (
                                        <span className="text-[10px] text-pink font-body uppercase tracking-[0.25em]">Generating stencil...</span>
                                    )}
                                    {stencilError && (
                                        <span className="text-[10px] text-pink font-body uppercase tracking-[0.25em]">{stencilError}</span>
                                    )}
                                </div>

                                {selectedLayer && (
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-black border-2 hairline p-4">
                                            <p className="text-[10px] font-body uppercase tracking-[0.28em] text-pink">
                                                <span className="text-pink">●</span>&nbsp;&nbsp;Layer Blend
                                            </p>
                                            <p className="text-[13px] text-white/70 mt-2 font-body">
                                                {selectedLayer.name}
                                            </p>
                                            <div className="mt-3">
                                                <BlendModeSelector
                                                    value={selectedLayer.blendMode}
                                                    onChange={(value) => updateBlendMode(selectedLayer.id, value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="bg-black border-2 hairline p-4 space-y-3">
                                            <p className="text-[10px] font-body uppercase tracking-[0.28em] text-pink">
                                                <span className="text-pink">●</span>&nbsp;&nbsp;Layer Actions
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="primary"
                                                    size="md"
                                                    onClick={() => setShowInpainting(true)}
                                                    icon={Wand2}
                                                >
                                                    Inpaint
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="md"
                                                    onClick={() => setShowCleanup(true)}
                                                    icon={Eraser}
                                                >
                                                    Clean Up
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    size="md"
                                                    onClick={() => {
                                                        setRestyleLayerId(selectedLayer.id);
                                                        setRestyleStyle(matchStyle);
                                                    }}
                                                    icon={Sparkles}
                                                >
                                                    Restyle
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="md"
                                                    onClick={handleExportPNG}
                                                    icon={Download}
                                                >
                                                    Export PNG
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <AdvancedOptions
                                    isExpanded={showAdvanced}
                                    onToggle={() => setShowAdvanced(!showAdvanced)}
                                    size={size}
                                    onSizeChange={setSize}
                                    aiModel={aiModel}
                                    onModelChange={setAiModel}
                                    negativePrompt={negativePrompt}
                                    onNegativePromptChange={setNegativePrompt}
                                    enhancementLevel={enhancementLevel}
                                    onEnhancementLevelChange={setEnhancementLevel}
                                    separateRGBA={separateRGBA}
                                    onSeparateRGBAChange={setSeparateRGBA}
                                />
                            </div>

                            <VersionTimeline
                                versions={timeline}
                                currentVersionId={currentVersionId}
                                onLoadVersion={handleLoadVersion}
                                onBranchVersion={handleBranchVersion}
                                onCompareVersions={handleCompareVersions}
                                onDeleteVersion={removeVersion}
                            />
                        </div>

                        <div className="xl:col-span-4 space-y-6">
                            <MatchPulseSidebar
                                matches={matches}
                                totalMatches={totalMatches}
                                isLoading={isMatching}
                                error={matchError}
                                context={matchContext}
                            />

                            <div className="bg-black border-2 hairline h-[360px]">
                                <LayerStack
                                    layers={layers}
                                    selectedLayerId={selectedLayerId}
                                    onSelectLayer={selectLayer}
                                    onToggleVisibility={toggleVisibility}
                                    onRename={rename}
                                    onDelete={deleteLayer}
                                    onReorder={reorder}
                                    onContextMenu={handleLayerContextMenu}
                                    onAddLayer={() => {
                                        setShowElementModal(true);
                                        setElementPrompt('');
                                        setElementType('subject');
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </FullBench>
            </div>

            {showStencilExport && stencilSourceUrl && (
                <div className="fixed inset-0 z-50 bg-black/80 halftone flex items-center justify-center p-4">
                    <div className="bg-black border-2 border-pink max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b-2 hairline">
                            <h3 className="text-[16px] font-display tracking-wide text-white uppercase">
                                <span className="text-pink">●</span>&nbsp;&nbsp;Stencil Export
                            </h3>
                            <button
                                onClick={() => setShowStencilExport(false)}
                                className="text-[10px] font-body uppercase tracking-[0.22em] text-white/60 hover:text-pink"
                            >
                                Close ✕
                            </button>
                        </div>
                        <div className="p-6">
                            <StencilExport imageUrl={stencilSourceUrl} designName={promptText || 'tattoo'} />
                        </div>
                    </div>
                </div>
            )}

            {showInpainting && selectedLayer?.imageUrl && (
                <InpaintingEditor
                    imageUrl={selectedLayer.imageUrl}
                    onClose={() => setShowInpainting(false)}
                    onSave={handleInpaintSave}
                />
            )}

            {showCleanup && selectedLayer?.imageUrl && (
                <CleanupTool
                    imageUrl={selectedLayer.imageUrl}
                    onClose={() => setShowCleanup(false)}
                    onSave={handleCleanupSave}
                />
            )}

            {showElementModal && (
                <div className="fixed inset-0 z-50 bg-black/80 halftone flex items-center justify-center p-4">
                    <div className="bg-black border-2 border-pink max-w-lg w-full">
                        <div className="flex items-center justify-between px-6 py-4 border-b-2 hairline">
                            <h3 className="text-[16px] font-display tracking-wide text-white uppercase">
                                <span className="text-pink">●</span>&nbsp;&nbsp;Add New Element
                            </h3>
                            <button
                                onClick={() => setShowElementModal(false)}
                                className="text-[10px] font-body uppercase tracking-[0.22em] text-white/60 hover:text-pink"
                                aria-label="Close add element modal"
                            >
                                Close ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="element-prompt" className="text-[10px] font-body uppercase tracking-[0.25em] text-pink">
                                    ▸ Element Prompt
                                </label>
                                <textarea
                                    id="element-prompt"
                                    value={elementPrompt}
                                    onChange={(e) => setElementPrompt(e.target.value)}
                                    placeholder="e.g., Add a koi fish, lightning bolt, ornamental frame"
                                    className="mt-2 w-full bg-black border-2 hairline focus:border-pink px-4 py-3 text-[14px] text-white font-display tracking-tight focus:outline-none placeholder-white/30 transition-colors"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label htmlFor="element-type" className="text-[10px] font-body uppercase tracking-[0.25em] text-pink">
                                    ▸ Element Type
                                </label>
                                <select
                                    id="element-type"
                                    value={elementType}
                                    onChange={(e) => setElementType(e.target.value)}
                                    className="mt-2 w-full bg-black border-2 hairline focus:border-pink px-4 py-3 text-[14px] text-white font-display tracking-tight uppercase focus:outline-none transition-colors"
                                >
                                    <option value="subject">Subject</option>
                                    <option value="background">Background</option>
                                    <option value="effect">Effect</option>
                                </select>
                            </div>
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleAddElement}
                                disabled={!elementPrompt.trim() || isGenerating}
                                icon={Plus}
                                className="w-full"
                            >
                                Generate Element
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {restyleLayerId && (
                <div className="fixed inset-0 z-50 bg-black/80 halftone flex items-center justify-center p-4">
                    <div className="bg-black border-2 border-pink max-w-lg w-full">
                        <div className="flex items-center justify-between px-6 py-4 border-b-2 hairline">
                            <h3 className="text-[16px] font-display tracking-wide text-white uppercase">
                                <span className="text-pink">●</span>&nbsp;&nbsp;Restyle Layer
                            </h3>
                            <button
                                onClick={() => {
                                    setRestyleLayerId(null);
                                    setRestyleStyle('');
                                }}
                                className="text-[10px] font-body uppercase tracking-[0.22em] text-white/60 hover:text-pink"
                            >
                                Close ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="restyle-style" className="text-[10px] font-body uppercase tracking-[0.25em] text-pink">
                                    ▸ New Style
                                </label>
                                <input
                                    id="restyle-style"
                                    type="text"
                                    value={restyleStyle}
                                    onChange={(e) => setRestyleStyle(e.target.value)}
                                    placeholder="e.g., Fine-line, Blackwork, Neo-traditional"
                                    className="mt-2 w-full bg-black border-2 hairline focus:border-pink px-4 py-3 text-[14px] text-white font-display tracking-tight focus:outline-none placeholder-white/30 transition-colors"
                                />
                                <p className="mt-2 text-[11px] text-white/60 font-body leading-[1.55]">
                                    We&apos;ll regenerate the selected layer using the new style while keeping the design&apos;s brief.
                                </p>
                            </div>
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleRestyle}
                                disabled={!restyleStyle.trim() || isGenerating}
                                icon={Sparkles}
                                className="w-full"
                            >
                                Apply Restyle
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {comparison && (
                <VersionComparison
                    versionA={comparison.versionA}
                    versionB={comparison.versionB}
                    onClose={() => setComparison(null)}
                    onRestoreA={(version) => handleLoadVersion(version.id)}
                    onRestoreB={(version) => handleLoadVersion(version.id)}
                    onMerge={handleMergeVersions}
                />
            )}

            {contextMenu && (
                <LayerContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    layer={contextMenu.layer}
                    onClose={() => setContextMenu(null)}
                    onRegenerate={(layer) => {
                        setRegenerateModal(layer);
                        setContextMenu(null);
                    }}
                    onDuplicate={handleDuplicateLayer}
                    onDelete={(layer) => {
                        deleteLayer(layer.id);
                        setContextMenu(null);
                    }}
                    onToggleVisibility={(layer) => {
                        toggleVisibility(layer.id);
                    }}
                    onInpaint={(layer) => {
                        selectLayer(layer.id);
                        setShowInpainting(true);
                        setContextMenu(null);
                    }}
                    onCleanup={(layer) => {
                        selectLayer(layer.id);
                        setShowCleanup(true);
                        setContextMenu(null);
                    }}
                />
            )}

            {regenerateModal && (
                <RegenerateElementModal
                    layer={regenerateModal}
                    onClose={() => setRegenerateModal(null)}
                    onRegenerate={handleRegenerateElementSubmit}
                    isGenerating={isGenerating}
                    error={generationError}
                />
            )}

            <KeyboardShortcutsModal
                isOpen={keyboardShortcuts.isOpen}
                onClose={keyboardShortcuts.close}
            />

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
}

// Wrap the entire component in ErrorBoundary for robustness
export function GenerateWithErrorBoundary(props) {
    return (
        <ErrorBoundary>
            <Generate {...props} />
        </ErrorBoundary>
    );
}
