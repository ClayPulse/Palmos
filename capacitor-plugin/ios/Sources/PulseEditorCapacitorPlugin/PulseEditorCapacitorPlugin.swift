import Foundation
import Capacitor

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(PulseEditorCapacitorPlugin)
public class PulseEditorCapacitorPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PulseEditorCapacitorPlugin"
    public let jsName = "PulseEditorCapacitor"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "echo", returnType: CAPPluginReturnPromise)
    ]
    private let implementation = PulseEditorCapacitor()

    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve([
            "value": implementation.echo(value)
        ])
    }
}
