#!/usr/bin/env python3
"""Read-only, deterministic inventory/topology audit for pinned Z-Anatomy targets.

This script does not import Blender's GPL helper into PalDawn. Pass the path to
an independently checked-out Blender tools/modules/blendfile.py at runtime.
It opens the .blend file read-only and emits JSON to stdout.
"""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import importlib
import json
import math
from pathlib import Path
import sys


TARGETS = (
    "OBRight atrium",
    "OBRight ventricle",
    "OBLeft atrium",
    "OBLeft ventricle",
    "OBAscending aorta",
    "OBLeft coronary artery",
    "OBAnterior interventricular artery",
    "OBCircumflex artery of heart",
    "OBRight coronary artery",
)

COLLECTIONS = (
    "GRHeart",
    "GRRoot of aorta",
    "GRAortic valve",
    "GRAortic sinuses",
)

OBJECT_TYPES = {1: "MESH", 2: "CURVE", 4: "FONT"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--blend", required=True, type=Path)
    parser.add_argument("--blendfile-module", required=True, type=Path)
    parser.add_argument("--blender-commit", required=True)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def id_name(block) -> str:
    return block.get((b"id", b"name"))


def linked_list(first, next_field: bytes = b"next"):
    current = first
    seen = set()
    while current is not None:
        if current.addr_old in seen:
            raise RuntimeError("cycle in Blender ListBase")
        seen.add(current.addr_old)
        yield current
        current = current.get_pointer(next_field)


def layer_data(mesh, custom_data: bytes, layer_type: int):
    layers = mesh.get_pointer((custom_data, b"layers"))
    if layers is None:
        raise RuntimeError(f"missing {custom_data.decode()} layers")
    matches = [
        layers.get_pointer(b"data", base_index=index)
        for index in range(layers.count)
        if layers.get(b"type", base_index=index) == layer_type
    ]
    if len(matches) != 1 or matches[0] is None:
        raise RuntimeError(
            f"expected one layer type {layer_type} in {custom_data.decode()}"
        )
    return matches[0]


def triangle_area(a, b, c) -> float:
    ab = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    ac = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
    cross = (
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
    )
    return 0.5 * math.sqrt(sum(value * value for value in cross))


def mesh_audit(mesh) -> dict:
    vertex_data = layer_data(mesh, b"vdata", 0)  # CD_MVERT
    edge_data = layer_data(mesh, b"edata", 3)  # CD_MEDGE
    poly_data = layer_data(mesh, b"pdata", 25)  # CD_MPOLY
    loop_data = layer_data(mesh, b"ldata", 26)  # CD_MLOOP

    vertices = [tuple(vertex_data.get(b"co", base_index=i)) for i in range(vertex_data.count)]
    edges = [
        (edge_data.get(b"v1", base_index=i), edge_data.get(b"v2", base_index=i))
        for i in range(edge_data.count)
    ]
    loops = [
        (loop_data.get(b"v", base_index=i), loop_data.get(b"e", base_index=i))
        for i in range(loop_data.count)
    ]
    polygons = []
    for index in range(poly_data.count):
        start = poly_data.get(b"loopstart", base_index=index)
        count = poly_data.get(b"totloop", base_index=index)
        polygons.append(loops[start : start + count])

    edge_use = Counter(edge_index for polygon in polygons for _, edge_index in polygon)
    used_vertices = {vertex for edge in edges for vertex in edge}
    parent = {vertex: vertex for vertex in used_vertices}

    def find(vertex):
        while parent[vertex] != vertex:
            parent[vertex] = parent[parent[vertex]]
            vertex = parent[vertex]
        return vertex

    def union(left, right):
        left_root, right_root = find(left), find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for left, right in edges:
        union(left, right)

    repeated_index_faces = 0
    near_zero_area_faces = 0
    for polygon in polygons:
        indices = [vertex for vertex, _ in polygon]
        repeated_index_faces += len(set(indices)) != len(indices)
        if len(indices) < 3:
            near_zero_area_faces += 1
            continue
        anchor = vertices[indices[0]]
        area = sum(
            triangle_area(anchor, vertices[indices[i]], vertices[indices[i + 1]])
            for i in range(1, len(indices) - 1)
        )
        near_zero_area_faces += area <= 1e-12

    duplicate_positions = len(vertices) - len(
        {tuple(round(component, 9) for component in vertex) for vertex in vertices}
    )
    zero_length_edges = sum(
        sum((vertices[left][axis] - vertices[right][axis]) ** 2 for axis in range(3))
        <= 1e-18
        for left, right in edges
    )

    return {
        "vertices": len(vertices),
        "edges": len(edges),
        "polygons": len(polygons),
        "boundary_edges": sum(count == 1 for count in edge_use.values()),
        "more_than_two_face_edges": sum(count > 2 for count in edge_use.values()),
        "connected_components_excluding_unused_vertices": len(
            {find(vertex) for vertex in used_vertices}
        ),
        "unused_vertices": len(vertices) - len(used_vertices),
        "zero_length_edges": zero_length_edges,
        "duplicate_positions_at_1e_9": duplicate_positions,
        "repeated_index_faces": repeated_index_faces,
        "near_zero_area_faces_at_1e_12": near_zero_area_faces,
        "closed_volume": all(count == 2 for count in edge_use.values()),
    }


def curve_audit(curve) -> dict:
    splines = list(linked_list(curve.get_pointer((b"nurb", b"first"))))
    radii = []
    control_points = 0
    cyclic = []
    kinds = []
    for spline in splines:
        point_count = spline.get(b"pntsu") * spline.get(b"pntsv")
        control_points += point_count
        cyclic.append(bool(spline.get(b"flagu") & 1))
        kind = spline.get(b"type") & 7
        kinds.append({0: "POLY", 1: "BEZIER", 4: "NURBS"}.get(kind, f"TYPE_{kind}"))
        bezier = spline.get_pointer(b"bezt")
        if bezier is not None:
            radii.extend(bezier.get(b"radius", base_index=i) for i in range(bezier.count))
    return {
        "curve_dimensions": "3D" if curve.get(b"flag") & 1 else "2D",
        "spline_kinds": sorted(set(kinds)),
        "splines": len(splines),
        "control_points": control_points,
        "all_splines_open": not any(cyclic),
        "base_bevel_source_scene_units": curve.get(b"ext2"),
        "bevel_resolution": curve.get(b"bevresol"),
        "radius_factor_min": min(radii) if radii else None,
        "radius_factor_max": max(radii) if radii else None,
    }


def collection_audit(collection) -> dict:
    direct_objects = []
    for link in linked_list(collection.get_pointer((b"gobject", b"first"))):
        obj = link.get_pointer(b"ob")
        if obj is not None:
            direct_objects.append(
                {"name": id_name(obj), "type": OBJECT_TYPES.get(obj.get(b"type"), str(obj.get(b"type")))}
            )
    child_collections = []
    for link in linked_list(collection.get_pointer((b"children", b"first"))):
        child = link.get_pointer(b"collection")
        if child is not None:
            child_collections.append(id_name(child))
    return {
        "direct_objects": sorted(direct_objects, key=lambda item: item["name"]),
        "child_collections": sorted(child_collections),
    }


def main() -> None:
    args = parse_args()
    module_path = args.blendfile_module.resolve()
    sys.path.insert(0, str(module_path.parent))
    blendfile = importlib.import_module("blendfile")

    output = {
        "method": {
            "mode": "read-only Blender DNA/data-block inspection; no resave or export",
            "blender_repository": "https://projects.blender.org/blender/blender.git",
            "blender_commit": args.blender_commit,
            "blendfile_module": "tools/modules/blendfile.py",
            "blend_sha256": sha256(args.blend),
        },
        "objects": {},
        "collections": {},
    }
    with blendfile.open_blend(str(args.blend), access="rb") as blend:
        objects = {id_name(block): block for block in blend.find_blocks_from_code(b"OB")}
        collections = {id_name(block): block for block in blend.find_blocks_from_code(b"GR")}
        for name in TARGETS:
            obj = objects[name]
            data = obj.get_pointer(b"data")
            item = {
                "object_name": name,
                "object_type": OBJECT_TYPES.get(obj.get(b"type"), str(obj.get(b"type"))),
                "data_block": id_name(data) if data is not None else None,
                "transform": {
                    "location": obj.get(b"loc"),
                    "rotation_euler": obj.get(b"rot"),
                    "scale": obj.get(b"size"),
                },
            }
            if obj.get(b"type") == 1:
                item["geometry"] = mesh_audit(data)
            elif obj.get(b"type") == 2:
                item["geometry"] = curve_audit(data)
            output["objects"][name] = item
        for name in COLLECTIONS:
            output["collections"][name] = collection_audit(collections[name])

    print(json.dumps(output, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
