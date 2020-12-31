/*!
 * based on https://github.com/WeiStaring/d3.KernelEdgeBundling
 * give x and y differnt extent: [xMin, xMax] and [yMin, yMax], rather than a shared extent: [minn, maxn], 
 * which will be more suitable for the situation that x and y fall in different intervals
 */
(function () {
    KernelEdgeBundling = function () {
        var data_nodes = {}, // {'nodeid':{'x':,'y':},..}
            data_edges = [], // [{'source':'nodeid1', 'target':'nodeid2'},..]
            SplattedAccMap = [],
            subdivision_points_for_edge = [],
            splitDistance = 0.01,  // 增大或减小, 都会变松. 增大会稍微平滑一点.
            removeDistance = 0.006, // 增大或减小, 都会变松. 增大会平滑些.
            AccResolution = 100,  // 增大, 股数变多. 减小, 股数变小.
            KernelSize = 15,  // 增大, 变松. 减小, 变紧. 默认15, 设为20会平滑一些
            Kernel = getKernel(KernelSize),
            GradientW = 15, // 增大, 变松. 减小, 变紧. 
            attractionFactor = 1.0, // 增大, 变紧. 减小, 变松
            iteration = 15,
            minn = 100000000000000000,
            maxn = -10000,

            xMin = 100000,
            xMax = -100000,
            yMin = 1000000,
            yMax = -1000000,
            auto_adaption = false;

        /*** Helper Methods ***/
        function filter_self_loops(edgelist) {
            var filtered_edge_list = [];
            for (var e = 0; e < edgelist.length; e++) {
                if (data_nodes[edgelist[e].source].x != data_nodes[edgelist[e].target].x ||
                    data_nodes[edgelist[e].source].y != data_nodes[edgelist[e].target].y) { //or smaller than eps
                    filtered_edge_list.push(edgelist[e]);
                }
            }

            return filtered_edge_list;
        }

        function euclidean_distance(p, q) {
            return Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2));
        }

        function toInt32(x) {
            /*** C# convert.ToInt32 ***/
            function help(x) {
                let i = Math.floor(x);
                let j = i + 1;
                let z = Math.round(x);
                if (x == (i + j) / 2) {
                    if (i % 2 == 0)
                        return i;
                    return j;
                }
                return z;
            }
            if (x >= 0)
                return help(x);
            else {
                x = -x;
                return -help(x);
            }
        }
        /*** ********************** ***/

        /*** Initialization Methods ***/
        function getKernel(KernSize) {
            let Kernel = [];
            for (let i = 0; i < KernSize * KernSize; i++)
                Kernel.push(0);
            for (let i = 0; i < KernSize * KernSize; i += KernSize) {
                for (let j = 0; j < KernSize; j++) {
                    let temp1 = j - (KernSize - 1) / 2;
                    let temp2 = i / KernSize - (KernSize - 1) / 2;
                    let centerDist = Math.sqrt(temp1 * temp1 + temp2 * temp2);
                    Kernel[i + j] = Math.max(0, 1 - Math.abs(2 / (KernSize - 1) * centerDist))
                }
            }
            return Kernel;
        }

        function NodeNormalize() {
            for (var key in data_nodes) {
                var item = data_nodes[key];
                xMin = Math.min(xMin, item.x);
                xMax = Math.max(xMax, item.x);

                yMin = Math.min(yMin, item.y);
                yMax = Math.max(yMax, item.y);
            }
        }

        function antiNormalize() {
            for (let line of subdivision_points_for_edge) {
                for (let point of line) {
                    point.x = point.x * (xMax - xMin) + xMin;
                    point.y = point.y * (yMax - yMin) + yMin;
                }
            }
        }
        function initialize_edge_subdivisions() {
            for (var i = 0; i < data_edges.length; i++) {
                subdivision_points_for_edge[i] = [];
                subdivision_points_for_edge[i].push({
                    'id': data_edges[i].source,
                    'x': (data_nodes[data_edges[i].source].x - xMin) / (xMax - xMin),
                    'y': (data_nodes[data_edges[i].source].y - yMin) / (yMax - yMin)
                });

                subdivision_points_for_edge[i].push({
                    'id': data_edges[i].target,
                    'x': (data_nodes[data_edges[i].target].x - xMin) / (xMax - xMin),
                    'y': (data_nodes[data_edges[i].target].y - yMin) / (yMax - yMin)
                });

            }
        }
        /*** ********************** ***/

        /*** Main Bundling Loop Methods ***/
        var forcebundle = function () {
            NodeNormalize();
            initialize_edge_subdivisions();
            for (let i = 0; i < iteration; i++) {
                if (auto_adaption == true && i == ~~(iteration * 0.6)) {
                    AccResolution = AccResolution * 2;
                    KernelSize = KernelSize - 2;
                    Kernel = getKernel(KernelSize);
                }
                bundle();
            }
            antiNormalize();
            return subdivision_points_for_edge;
        };
        /*** ************************ ***/

        /*** Force Calculation Methods ***/
        function bundle() {
            Resample(splitDistance, removeDistance);
            // Splatting
            ComputeSplatting();
            // // Apply Gradient
            ApplyGradient(GradientW, attractionFactor, SplattedAccMap);
            // Smooth trajectories
            SmoothTrajectories()
        }

        function Resample() {
            let tempVertex = subdivision_points_for_edge;
            for (let i = 0; i < tempVertex.length; i++) {
                let tmpVertexList = [];
                tmpVertexList.push(tempVertex[i][0]);
                for (let j = 0; j < tempVertex[i].length - 1; j++) {
                    let currentVert = tempVertex[i][j];
                    let nextVert = tempVertex[i][j + 1];
                    let dist = euclidean_distance(currentVert, nextVert);
                    if (dist > splitDistance) {
                        let x = currentVert['x'] + nextVert['x'];
                        let y = currentVert['y'] + nextVert['y'];
                        tmpVertexList.push({ 'x': x / 2, 'y': y / 2 })
                    }
                    if (!(dist < removeDistance) || j == tempVertex[i].length - 2) {
                        tmpVertexList.push(nextVert);
                    }
                }
                tempVertex[i] = tmpVertexList;
            }
            subdivision_points_for_edge = tempVertex;
        }

        function ComputeSplatting() {
            let AccMap = [];
            for (let i = 0; i < AccResolution * AccResolution; i++)
                AccMap.push(0);
            for (let line of subdivision_points_for_edge) {
                for (let point of line) {
                    for (let i = 0; i < Kernel.length; i += KernelSize) {
                        for (let j = 0; j < KernelSize; j++) {
                            let x = toInt32(point['x'] * AccResolution) * AccResolution + (~~(i / KernelSize) - ~~(KernelSize / 2)) * AccResolution;
                            let y = toInt32(point['y'] * AccResolution) + j - ~~(KernelSize / 2);
                            if (x > 0 && x < AccMap.length && y > 0 && y < AccResolution) {
                                AccMap[x + y] += Kernel[i + j];
                            }
                        }
                    }
                }
            }
            SplattedAccMap = AccMap;
        }
        function ApplyGradient(GradientW, attractionFactor, SplattedAccMap) {
            for (let line of subdivision_points_for_edge) {
                for (let j = 1; j < line.length - 1; j++) {
                    let pointIndex = toInt32(line[j]['x'] * AccResolution) * AccResolution + toInt32(line[j]['y'] * AccResolution);
                    let localGradient = GetLocalGradient(GradientW, SplattedAccMap, line[j], pointIndex);
                    if (localGradient[0] != 0 || localGradient[1] != 0)
                        localGradient = gradientNormalize(localGradient);
                    line[j]['x'] = line[j]['x'] + attractionFactor * localGradient[0] / AccResolution;
                    line[j]['y'] = line[j]['y'] + attractionFactor * localGradient[1] / AccResolution;
                }
            }
        }
        function GetLocalGradient(gradientW, AccMap, point, pointIndex) {
            let localGradient1 = 0;
            let localGradient2 = 0;

            for (let i = 0; i < gradientW; i++) {
                for (let j = 0; j < gradientW; j++) {
                    let offsetIndex = (i - ~~(GradientW / 2)) * AccResolution + j - ~~(GradientW / 2);
                    if (~~((pointIndex + offsetIndex) / AccResolution) > 0
                        && ~~((pointIndex + offsetIndex) / AccResolution) < AccResolution
                        && (pointIndex + offsetIndex) % AccResolution > 0
                        && (pointIndex + offsetIndex) % AccResolution < AccResolution) {
                        let localDensity = AccMap[pointIndex + offsetIndex];
                        let dX = i - ~~(GradientW / 2);
                        let dY = j - ~~(GradientW / 2);
                        localGradient1 += localDensity * dX;
                        localGradient2 += localDensity * dY;
                    }
                }
            }
            return [localGradient1, localGradient2];
        }

        function gradientNormalize(localGradient) {
            let x = localGradient[0];
            let y = localGradient[1];
            let l = Math.sqrt(x * x + y * y);
            localGradient[0] = x / l;
            localGradient[1] = y / l;
            return localGradient;
        }

        function SmoothTrajectories() {
            for (let line of subdivision_points_for_edge) {
                for (let i = 1; i < line.length - 1; i++) {
                    line[i]['x'] = (line[i - 1]['x'] + line[i]['x'] + line[i + 1]['x']) / 3;
                    line[i]['y'] = (line[i - 1]['y'] + line[i]['y'] + line[i + 1]['y']) / 3;
                }
            }
        }
        /*** ********************** ***/

        /*** Getters/Setters Methods ***/
        forcebundle.nodes = function (nl) {
            if (arguments.length === 0) {
                return data_nodes;
            } else {
                data_nodes = nl;
            }
            return forcebundle;
        };

        forcebundle.edges = function (ll) {
            if (arguments.length === 0) {
                return data_edges;
            } else {
                data_edges = filter_self_loops(ll); //remove edges to from to the same point
            }
            return forcebundle;
        };

        forcebundle.splitDis = function (i) {
            if (arguments.length === 0) {
                return splitDistance;
            } else {
                splitDistance = i;
            }
            return forcebundle;
        };

        forcebundle.removeDis = function (i) {
            if (arguments.length === 0) {
                return removeDistance;
            } else {
                removeDistance = i;
            }
            return forcebundle;
        };

        forcebundle.resolution = function (i) {
            if (arguments.length === 0) {
                return AccResolution;
            } else {
                AccResolution = i;
            }
            return forcebundle;
        };

        forcebundle.kernelSize = function (i) {
            if (arguments.length === 0) {
                return KernelSize;
            } else {
                KernelSize = i;
                Kernel = getKernel(KernelSize);
            }
            return forcebundle;
        };

        forcebundle.gradientW = function (i) {
            if (arguments.length === 0) {
                return GradientW;
            } else {
                GradientW = i;
            }
            return forcebundle;
        };

        forcebundle.attract = function (i) {
            if (arguments.length === 0) {
                return attractionFactor;
            } else {
                attractionFactor = i;
            }
            return forcebundle;
        };

        forcebundle.iteration = function (i) {
            if (arguments.length === 0) {
                return iteration;
            } else {
                iteration = i;
            }
            return forcebundle;
        };

        forcebundle.autoAdapt = function (i) {
            if (arguments.length === 0) {
                return auto_adaption;
            } else {
                auto_adaption = i;
            }
            return forcebundle;
        };
        /*** ************************ ***/
        return forcebundle;
    }
})();
