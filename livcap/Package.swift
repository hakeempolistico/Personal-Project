// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Livcap",
    platforms: [
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "livcap",
            path: "Sources"
        )
    ]
)
