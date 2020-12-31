Papa.parse("./shop.csv", {
    download: true,
    header: true,
    complete: (shops) => {
        Papa.parse("./randomRelationClu_320.csv", {
            download: true,
            header: true,
            complete: (relations) => {
                render(shops.data, relations.data);
            }
        })
    }
})

function render(shops, relations) {
    console.log("shops", shops);
    console.log("relations", relations)

    let eedges = [];
	let nnodes = {};
	let min_longitude = Number.MAX_VALUE;
	let max_longitude = 0;
	let min_latitude = Number.MAX_VALUE;
	let max_latitude = 0;

	for(let i=0; i<shops.length; i++){
		let key = shops[i].id;
		let longitude = +shops[i].longitude;
		let latitude = +shops[i].latitude;

        nnodes[key] = {x: longitude, y: latitude};
		min_longitude = Math.min(min_longitude, longitude);
		max_longitude = Math.max(max_longitude, longitude);
		min_latitude = Math.min(min_latitude, latitude);
		max_latitude = Math.max(max_latitude, latitude);
	}

	for(var i = 0; i < relations.length; i++){
				eedges.push({'source':relations[i].from, 
					'target':relations[i].to});
	}



	// console.log(min_longitude);
	// console.log(max_longitude);
	// console.log(min_latitude);
	// console.log(max_latitude);
	var new_scale_x = d3.scaleLinear().domain([min_longitude,max_longitude]).range([50,900]);
	var new_scale_y = d3.scaleLinear().domain([min_latitude, max_latitude]).range([700,50]);
	for(var i = 0; i < shops.length; i++){
		nnodes[i].x = new_scale_x(nnodes[i].x);
		nnodes[i].y = new_scale_y(nnodes[i].y);
	}

	console.log("nnodes2", nnodes);
    console.log('eedges2', eedges);
    
    const fbundling = KernelEdgeBundling()
        .nodes(nnodes)
        .edges(eedges)
        // .splitDis(0.01)
        // .removeDis(0.9)
        // .resolution(0.9)
        // .kernelSize(0.9)
        // .gradientW(0.9)
        // .attract(0.9)
        .iteration(15)
        // .autoAdapt(0.9);
    const results = fbundling();
    console.log("results", results);
    console.log('******');



    /* draw network*/
    const canvas = document.getElementById("myCanvas2");
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = "red";
    ctx.globalAlpha = 0.2;

    for(let i of results){
        ctx.beginPath();
        const start = i.shift()
        ctx.moveTo(start.x, start.y)
        for(let node of i){
            ctx.lineTo(node.x, node.y)
        }
        ctx.stroke()
    }
}



// const node_data = {
//     "0": {"x":0, "y":100},
//     "1": {"x":100, "y":0},
//     "2": {"x":100, "y":100},
//     "3": {"x":200, "y":100},
//     "4": {"x":200, "y":200},
// }
// const edge_data = [{'source':'0', 'target':'1'},
//     {'source':'0', 'target':'2'},
//     {'source':'3', 'target':'4'},
//     {'source':'2', 'target':'4'},
//     {'source':'1', 'target':'3'}]

// const fbundling = KernelEdgeBundling()
//     .nodes(node_data)
//     .edges(edge_data)
//     // .splitDis(0.01)
//     // .removeDis(0.9)
//     // .resolution(0.9)
//     // .kernelSize(0.9)
//     // .gradientW(0.9)
//     // .attract(0.9)
//     // .iteration(0.9)
//     // .autoAdapt(0.9);
// const results = fbundling();
// console.log(results)

// console.log(2)
// const canvas = document.getElementById("myCanvas");
// const ctx = canvas.getContext('2d')

// for(let i of results){
//     ctx.beginPath();
//     const start = i.shift()
//     ctx.moveTo(start.x, start.y)
//     for(let node of i){
//         ctx.lineTo(node.x, node.y)
//     }
//     ctx.stroke()
// }


