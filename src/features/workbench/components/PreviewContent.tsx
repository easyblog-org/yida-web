import { useCallback, useEffect, useRef, useState } from 'react'

import { usePreviewDockDrag } from '../hooks/usePreviewDockDrag'
import { usePreviewSession } from '../hooks/usePreviewSession'
import { usePreviewVisualEditBridge } from '../hooks/usePreviewVisualEditBridge'
import { useWorkbenchRuntimeStore } from '../stores/useWorkbenchRuntimeStore'
import { DEFAULT_PREVIEW_DOCK_STATE, type PreviewDockState } from '../utils/previewDock'
import { PreviewActionDock } from './PreviewActionDock'
import { PreviewEmptyState } from './PreviewEmptyState'

export function PreviewContent({ appId, errorMessage }: { appId?: string; errorMessage?: string }) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const lastPreviewRefreshVersionRef = useRef(0)
  const [previewDockState, setPreviewDockState] = useState<PreviewDockState>(
    DEFAULT_PREVIEW_DOCK_STATE,
  )
  const isGenerating = useWorkbenchRuntimeStore((state) => state.isGenerating)
  const isVisualEditMode = useWorkbenchRuntimeStore((state) => state.isVisualEditMode)
  const previewRefreshVersion = useWorkbenchRuntimeStore((state) => state.previewRefreshVersion)
  const setPreviewReady = useWorkbenchRuntimeStore((state) => state.setPreviewReady)
  const setSelectedVisualEditElement = useWorkbenchRuntimeStore(
    (state) => state.setSelectedVisualEditElement,
  )
  const {
    previewUrl,
    iframeSrc,
    errorMessage: previewSessionErrorMessage,
    isLoading: isCreatingPreviewSession,
    refresh,
  } = usePreviewSession({
    appId,
  })
  const { handlePreviewLoad } = usePreviewVisualEditBridge({
    iframeRef,
    isVisualEditMode,
    onElementSelect: setSelectedVisualEditElement,
  })
  const { isDraggingDock, handleDockPointerDown, handleDockPointerMove, handleDockPointerEnd } =
    usePreviewDockDrag({
      dockRef,
      previewContainerRef,
      previewDockState,
      onPreviewDockStateChange: setPreviewDockState,
    })

  const handleOpenPreview = () => {
    if (previewUrl) {
      window.open(iframeSrc, '_blank', 'noreferrer')
    }
  }

  const handleRefreshPreview = useCallback(() => {
    setPreviewReady(false)
    refresh()
  }, [refresh, setPreviewReady])

  const handleIframeLoad = useCallback(() => {
    handlePreviewLoad()

    if (previewUrl) {
      setPreviewReady(true)
    }
  }, [handlePreviewLoad, previewUrl, setPreviewReady])

  const handleDockCollapse = () => {
    setPreviewDockState((state) => ({
      ...state,
      isExpanded: false,
    }))
  }

  const handleDockExpand = () => {
    setPreviewDockState((state) => ({
      ...state,
      isExpanded: true,
    }))
  }

  const emptyErrorMessage = errorMessage ?? previewSessionErrorMessage
  const isResourceNotFound = /不存在|未生成|暂无|not found|not generated/i.test(
    emptyErrorMessage ?? '',
  )
  const emptyErrorTitle = (() => {
    if (errorMessage) {
      return undefined
    }
    if (previewSessionErrorMessage) {
      return isResourceNotFound ? '预览尚未就绪' : '预览加载失败'
    }
    return undefined
  })()

  useEffect(() => {
    if (
      previewRefreshVersion > 0 &&
      lastPreviewRefreshVersionRef.current !== previewRefreshVersion
    ) {
      lastPreviewRefreshVersionRef.current = previewRefreshVersion
      handleRefreshPreview()
    }
  }, [previewRefreshVersion, handleRefreshPreview])

  useEffect(() => {
    setPreviewReady(false)
  }, [appId, iframeSrc, setPreviewReady])

  return (
    <div
      ref={previewContainerRef}
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white"
    >
      <PreviewActionDock
        dockRef={dockRef}
        isDragging={isDraggingDock}
        isExpanded={previewDockState.isExpanded}
        offsetY={previewDockState.offsetY}
        previewUrl={previewUrl}
        canRefresh={Boolean(appId)}
        onCollapse={handleDockCollapse}
        onExpand={handleDockExpand}
        onOpenPreview={handleOpenPreview}
        onRefresh={handleRefreshPreview}
        onDragPointerDown={handleDockPointerDown}
        onDragPointerMove={handleDockPointerMove}
        onDragPointerEnd={handleDockPointerEnd}
      />

      <div className="relative min-h-0 flex-1">
        <iframe
          id="preview"
          ref={iframeRef}
          title="当前应用预览"
          src={iframeSrc}
          allow="fullscreen; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={handleIframeLoad}
          className="h-full w-full border-0 bg-transparent"
        />
        {isDraggingDock && (
          <div
            className="absolute inset-0 z-9 cursor-grabbing"
            aria-hidden="true"
          />
        )}
        {!previewUrl && (
          <PreviewEmptyState
            errorMessage={emptyErrorMessage}
            errorTitle={emptyErrorTitle}
            isGenerating={isGenerating}
            isLoading={Boolean(appId && isCreatingPreviewSession)}
          />
        )}
      </div>
    </div>
  )
}
