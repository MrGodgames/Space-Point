use tauri::Manager;

#[cfg(target_os = "ios")]
use objc2::rc::Retained;
#[cfg(target_os = "ios")]
use objc2::runtime::AnyObject;
#[cfg(target_os = "ios")]
use objc2_core_foundation::CGPoint;
#[cfg(target_os = "ios")]
use objc2_ui_kit::{
    UIEdgeInsetsZero, UIScrollView, UIScrollViewContentInsetAdjustmentBehavior,
    UIScrollViewKeyboardDismissMode,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(target_os = "ios")]
fn refresh_ios_webview_window<R: tauri::Runtime>(
    webview_window: &tauri::WebviewWindow<R>,
) -> tauri::Result<()> {
    webview_window.with_webview(|webview| unsafe {
        let webview = &*(webview.inner().cast::<AnyObject>());
        let scroll_view: Retained<UIScrollView> = objc2::msg_send![webview, scrollView];

        scroll_view.setBounces(false);
        scroll_view.setBouncesHorizontally(false);
        scroll_view.setBouncesVertically(false);
        scroll_view.setDirectionalLockEnabled(true);
        scroll_view.setScrollEnabled(false);
        scroll_view.setContentInsetAdjustmentBehavior(
            UIScrollViewContentInsetAdjustmentBehavior::Never,
        );
        scroll_view.setAutomaticallyAdjustsScrollIndicatorInsets(false);
        scroll_view.setKeyboardDismissMode(UIScrollViewKeyboardDismissMode::Interactive);
        scroll_view.setContentOffset(CGPoint::ZERO);
        scroll_view.setContentInset(UIEdgeInsetsZero);
        scroll_view.setScrollIndicatorInsets(UIEdgeInsetsZero);

        let _: () = objc2::msg_send![&*scroll_view, setNeedsLayout];
        let _: () = objc2::msg_send![&*scroll_view, layoutIfNeeded];
        let _: () = objc2::msg_send![webview, setNeedsLayout];
        let _: () = objc2::msg_send![webview, layoutIfNeeded];
    })
}

#[cfg(not(target_os = "ios"))]
fn refresh_ios_webview_window<R: tauri::Runtime>(
    _webview_window: &tauri::WebviewWindow<R>,
) -> tauri::Result<()> {
    Ok(())
}

#[tauri::command]
fn ios_refresh_webviews<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    for webview_window in app.webview_windows().into_values() {
        refresh_ios_webview_window(&webview_window).map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            for webview_window in app.webview_windows().into_values() {
                let _ = refresh_ios_webview_window(&webview_window);
            }

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, ios_refresh_webviews])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
