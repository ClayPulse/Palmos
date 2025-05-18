// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PulseEditorCapacitorPlugin",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "PulseEditorCapacitorPlugin",
            targets: ["PulseEditorCapacitorPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")
    ],
    targets: [
        .target(
            name: "PulseEditorCapacitorPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/PulseEditorCapacitorPlugin"),
        .testTarget(
            name: "PulseEditorCapacitorPluginTests",
            dependencies: ["PulseEditorCapacitorPlugin"],
            path: "ios/Tests/PulseEditorCapacitorPluginTests")
    ]
)