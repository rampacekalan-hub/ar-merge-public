import Foundation
import PDFKit
import Quartz

struct Preset {
    let quality: Double
    let resolution: Int
    let maxSize: Int
}

struct Candidate {
    let preset: Preset
    let outputURL: URL
    let outputBytes: Int
}

struct CompressionPayload: Encodable {
    let status: String
    let original_bytes: Int
    let output_bytes: Int
    let target_bytes: Int
    let reached_target: Bool
}

enum CompressionError: Error {
    case invalidArguments
    case missingInputFile
    case failedToOpenDocument
    case failedToCreateFilter
    case failedToWriteOutput
    case missingOutput
}

let basePresets: [Preset] = [
    Preset(quality: 0.90, resolution: 144, maxSize: 2600),
    Preset(quality: 0.82, resolution: 132, maxSize: 2400),
    Preset(quality: 0.72, resolution: 120, maxSize: 2200),
    Preset(quality: 0.62, resolution: 108, maxSize: 2000),
    Preset(quality: 0.52, resolution: 96, maxSize: 1800),
    Preset(quality: 0.42, resolution: 84, maxSize: 1600),
    Preset(quality: 0.32, resolution: 72, maxSize: 1400),
    Preset(quality: 0.24, resolution: 64, maxSize: 1280),
    Preset(quality: 0.18, resolution: 56, maxSize: 1100),
]

func writeFilter(to url: URL, preset: Preset) throws {
    let payload: [String: Any] = [
        "Domains": [
            "Applications": true,
            "Printing": true,
        ],
        "FilterType": 1,
        "Name": "AR Compress",
        "FilterData": [
            "ColorSettings": [
                "ImageSettings": [
                    "Compression Quality": preset.quality,
                    "ImageCompression": "ImageJPEGCompress",
                    "ImageScaleSettings": [
                        "ImageResolution": preset.resolution,
                        "ImageScaleInterpolate": true,
                        "ImageSizeMax": preset.maxSize,
                        "ImageSizeMin": 0,
                    ],
                ],
            ],
        ],
    ]

    let data = try PropertyListSerialization.data(fromPropertyList: payload, format: .xml, options: 0)
    try data.write(to: url)
}

func buildOptions(filter: QuartzFilter) -> [PDFDocumentWriteOption: Any] {
    let quartzFilterOption = PDFDocumentWriteOption(rawValue: "QuartzFilter")
    return [
        quartzFilterOption: filter,
        .saveImagesAsJPEGOption: true,
        .optimizeImagesForScreenOption: true,
    ]
}

func fileSize(at url: URL) throws -> Int {
    let values = try url.resourceValues(forKeys: [.fileSizeKey])
    return values.fileSize ?? 0
}

func interpolatedPresets(from higher: Preset, to lower: Preset) -> [Preset] {
    let ratios: [Double] = [0.2, 0.4, 0.6, 0.8]
    return ratios.map { ratio in
        Preset(
            quality: higher.quality + ((lower.quality - higher.quality) * ratio),
            resolution: Int(round(Double(higher.resolution) + (Double(lower.resolution - higher.resolution) * ratio))),
            maxSize: Int(round(Double(higher.maxSize) + (Double(lower.maxSize - higher.maxSize) * ratio)))
        )
    }
}

func compress(document: PDFDocument, using preset: Preset, in tempDir: URL, index: Int) throws -> Candidate {
    let filterURL = tempDir.appendingPathComponent("preset-\(index).qfilter")
    let outputURL = tempDir.appendingPathComponent("candidate-\(index).pdf")
    try writeFilter(to: filterURL, preset: preset)

    guard let filter = QuartzFilter(url: filterURL) else {
        throw CompressionError.failedToCreateFilter
    }

    let didWrite = document.write(to: outputURL, withOptions: buildOptions(filter: filter))
    guard didWrite else {
        throw CompressionError.failedToWriteOutput
    }

    return Candidate(
        preset: preset,
        outputURL: outputURL,
        outputBytes: try fileSize(at: outputURL)
    )
}

func selectBestCandidate(_ candidates: [Candidate], targetBytes: Int) -> Candidate? {
    if let bestUnderTarget = candidates
        .filter({ $0.outputBytes <= targetBytes })
        .max(by: { $0.outputBytes < $1.outputBytes }) {
        return bestUnderTarget
    }

    return candidates.min(by: { $0.outputBytes < $1.outputBytes })
}

func emit(_ payload: CompressionPayload) throws {
    let encoder = JSONEncoder()
    let data = try encoder.encode(payload)
    guard let text = String(data: data, encoding: .utf8) else {
        return
    }
    print(text)
}

do {
    guard CommandLine.arguments.count == 4 else {
        throw CompressionError.invalidArguments
    }

    let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
    let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
    guard let targetBytes = Int(CommandLine.arguments[3]) else {
        throw CompressionError.invalidArguments
    }

    guard FileManager.default.fileExists(atPath: inputURL.path) else {
        throw CompressionError.missingInputFile
    }

    let originalBytes = try fileSize(at: inputURL)
    if originalBytes <= targetBytes {
        _ = try? FileManager.default.removeItem(at: outputURL)
        try FileManager.default.copyItem(at: inputURL, to: outputURL)
        try emit(
            CompressionPayload(
                status: "already-small-enough",
                original_bytes: originalBytes,
                output_bytes: originalBytes,
                target_bytes: targetBytes,
                reached_target: true
            )
        )
        exit(0)
    }

    guard let document = PDFDocument(url: inputURL) else {
        throw CompressionError.failedToOpenDocument
    }

    let tempDir = URL(fileURLWithPath: NSTemporaryDirectory())
        .appendingPathComponent("ar-pdf-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true, attributes: nil)
    defer { try? FileManager.default.removeItem(at: tempDir) }

    var candidates: [Candidate] = []
    var previousCandidate: Candidate?

    for (index, preset) in basePresets.enumerated() {
        let candidate = try compress(document: document, using: preset, in: tempDir, index: index)
        candidates.append(candidate)

        if candidate.outputBytes <= targetBytes, let previousCandidate {
            let refined = interpolatedPresets(from: previousCandidate.preset, to: preset)
            for (refinedIndex, refinedPreset) in refined.enumerated() {
                let refinedCandidate = try compress(
                    document: document,
                    using: refinedPreset,
                    in: tempDir,
                    index: 100 + refinedIndex + (index * 10)
                )
                candidates.append(refinedCandidate)
            }
            break
        }

        previousCandidate = candidate
    }

    guard let chosen = selectBestCandidate(candidates, targetBytes: targetBytes) else {
        throw CompressionError.missingOutput
    }

    let finalStatus: String
    let finalBytes: Int

    _ = try? FileManager.default.removeItem(at: outputURL)

    if chosen.outputBytes >= originalBytes {
        try FileManager.default.copyItem(at: inputURL, to: outputURL)
        finalStatus = "already-optimized"
        finalBytes = originalBytes
    } else {
        try FileManager.default.copyItem(at: chosen.outputURL, to: outputURL)
        finalStatus = chosen.outputBytes <= targetBytes ? "compressed" : "best-effort"
        finalBytes = chosen.outputBytes
    }

    try emit(
        CompressionPayload(
            status: finalStatus,
            original_bytes: originalBytes,
            output_bytes: finalBytes,
            target_bytes: targetBytes,
            reached_target: finalBytes <= targetBytes
        )
    )
} catch CompressionError.invalidArguments {
    fputs("Použitie: swift pdf_compressor.swift input.pdf output.pdf cielove_bajty\n", stderr)
    exit(1)
} catch {
    fputs("\(error)\n", stderr)
    exit(1)
}
