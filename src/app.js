require("./css/style.scss");
require("./favicon.ico");
// import $ from 'jquery';
import map from 'lodash/map';

document.addEventListener("DOMContentLoaded", function(event) {
  
  //init materialize accordion
  const elems = document.querySelectorAll('.collapsible');
  const instances = M.Collapsible.init(elems, {});
  
  document.querySelector("#country-search").addEventListener("submit", async (e)  => {
    //stop default form action
    e.preventDefault();

    const country = document.querySelector("#country-name").value;
  
    //validate form
    if(!validateForm(e.target)) {
      return false
    }
    //when input value is correct then save to storage
    // StoreService.save("country", country);

    UIService.clearElement(".results-header");
    UIService.clearElement("#cities-list");
    //show loader
    UIService.toggleLoader("#loader");

    const countrySlug = UIService.convertToSlug(country);

    const cities = await OpenAQService.getCities(countrySlug);

    const citiesInfo = await WikipediaService.getCitiesInfo(cities);

    UIService.renderCities(citiesInfo, country);
    // StoreService.get("country");

  });


// instancje nazwac const UIService, a constructor UI
 class UI {

    //render items in DOM
    renderCities(cities, country) {
      const container = document.querySelector("#cities-list");
      const header = document.querySelector(".results-header");
      //use lodash map iterate through objects collection
      header.innerHTML = `Cities with the most polluted air in ${country}:`
      //hide loader
      this.toggleLoader("#loader");

      map(cities, city => {
        const { title, extract } = city;
        const item = document.createElement("li");
        const desc = extract ? extract.replace(/<(?:.|\n)*?>/gm, '') 
                             : "Here is no description about this place";
        item.innerHTML = `
        <div class="collapsible-header light-blue darken-1 white-text">
          <i class="material-icons">location_city</i>${title}
        </div>
        <div class="collapsible-body ">
          <span>${desc}</span>
        </div>
        `
        container.appendChild(item);
      })
    }

    toggleLoader(element) {
      const loader = document.querySelector(element);
      if (loader.classList.contains("active")) loader.classList.remove("active")
      else loader.classList.add("active")
    }

    clearElement(element) {
      document.querySelector(element).innerHTML = "";
    }

    convertToSlug(countryName) {
      
      const slugStorage = {
        "Poland" : "PL",
        "Germany": "DE",
        "Spain": "ES",
        "France": "FR",
      }
      
      return slugStorage[countryName] !== undefined 
        ? slugStorage[countryName]
        : null // Default value
    }

    showAlert(text, type) {
      const alertContainer = document.querySelector(".alert-container");
      const alert = document.createElement("div");
      alert.classList.add("alert", type==="success"?"green":"yellow", "lighten-4", "center-align");
      alert.innerHTML = `<p>${text}</p>`;
      alertContainer.appendChild(alert)
      setTimeout(
        () => {
          alert.style.height = 0
          alert.style.padding = 0
        }
        , 4500
      )
    }

    setInputValue(input, value) {
      document.querySelector(input).value = value;
    }

    toggleLocationIcon(action) {
      const icon = document.querySelector("#location-icon");
      action === "enable" ? icon.textContent = "my_location" : icon.textContent = "location_disabled"
    }

    getLocation() {
      if (navigator.geolocation) {
        //get user location
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          //fetch user's country with location coords
          fetch(`http://api.geonames.org/countryCode?lat=${latitude}&lng=${longitude}&type=json&username=bastej`)
          .then(response => response.json())
          .then(response => {
            //set input value to detected country
            this.toggleLocationIcon("enable");
            this.setInputValue("#country-name", response.countryName)
            this.showAlert("Country detected automatically", "success")
          })
        }, 
          () => {
            this.toggleLocationIcon("disable");
            this.showAlert("Location is disabled, enable the location to automatically detect the country.", "warning")
          }   
        );
      }
    }


  } 
  const UIService = new UI(); 
  //get location if enabled
  UIService.getLocation();

  //help to fetch data with jsonp from API that don't support CORS
  const loadJSONP = (function(){
    return function(url, callback, config) {
      const name = "_jsonp_" + Math.floor(Date.now() / 100);
      let params;
      if(Object.keys(config).length) {
        let checkedConfig = {...config, format: "json"};//check if json format exist
        params = Object.keys(checkedConfig).reduce(
          (newArr, key) => {
            newArr.push(key+'='+encodeURIComponent(checkedConfig[key]));
            return newArr
          },[]).join("&")
      }
      //check if url already contain any parameter
      if (url.match(/\?/)) url += `${params || ""}&callback=${name}`; 
      else url += `?${params+"&" || ""}callback=${name}`;

      // Create script
      let script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      // Setup handler
      window[name] = function(data){
        //set this to window object, pass data
        callback.call(window, data);
        document.getElementsByTagName('head')[0].removeChild(script);
        script = null;
        delete window[name];
      };
      // Load JSON, set to first position to easy pick up when deleting
      document.getElementsByTagName('head')[0].appendChild(script);
    };
  })();

  //form validation obj
  const validateForm = (function(){
    return function(form) {
      var fields = form.querySelectorAll("[required]");
      var errors = [];
      var formValid = validate(errors);
      function validate(errors) {
        //IE support
        for (var i = 0; i < fields.length; i++) {
          validateField(fields[i], errors);
        }
        return !errors.length;
      }
      function validateField(field, errors) {
        var fieldValid = field.validity.valid;
        if (fieldValid) {
          setAsValid(field);
        } else {
          //clear field view when is empty 
          field.onblur = () => {
            if(field.value === "") setAsValid(field);
          }
          setAsInvalid(field);
          errors.push(field.dataset.errorMessage);
        }
      }
      function setAsValid(field) {
        field.parentNode.querySelector("span").innerHTML = "";
        field.classList.remove("invalid");
      }
      function setAsInvalid(field){
        field.parentNode.querySelector("span").innerHTML = field.dataset.errorMessage;
        field.classList.add("invalid");
      }
      if (formValid) {
        return true;
      } else {
        return false;
      }
    }
  })();

  class Store {

    save(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    get(key) {
      return JSON.parse(localStorage.getItem(key));
    }
    
  }
  var StoreService = new Store();

  class Wikipedia {
    
    //get cities descriptions
    getCitiesInfo(citiesArr) {
      
      const titles = citiesArr.join("|");

        const config = {
          action: "query",
          prop: "extracts",
          exintro: true,
          titles, 
        }

        return new Promise(resolve => {
          loadJSONP(
            "https://en.wikipedia.org/w/api.php",
            function(data) {
              resolve(data.query.pages);
            },
            config
          );

          // or just use ajax
          // $.ajax({
          //   url: 'http://en.wikipedia.org/w/api.php',
          //   data: {
          //     action: 'query',
          //     prop: 'info',
          //     titles: "Katowice|Opole",
          //     format:'json'
          //   },
          //   dataType:'jsonp',
          //   success: function(data) {
          //     console.log(data);
          //   }
          //   });

        })
    }
  }
  const WikipediaService = new Wikipedia();

  class OpenAQ {

    //fetch 10 most air polluted cities
    getCities(country) {
      return fetch(`https://api.openaq.org/v1/latest?country=${country}&parameter=pm25`)
      // Parse JSON response
      .then(response => response.json())
      // Sort from the largest by value of first measurement 
      .then(response => response.results.sort((a, b) => b.measurements[0].value - a.measurements[0].value))
      // Make results unique by city
      .then(results => Object.values(
          results.reduce((uniqueResults, result) => {
          if (uniqueResults[result.city] === undefined) {
              uniqueResults[result.city] = result
          }
          return uniqueResults
          }, {})
      ))
      // Slice results to 10, because we want only 10 cities
      .then(results => results.slice(0, 10))
      // List results
      .then(results => results.map(result => result.city))
    }

  }
  const OpenAQService = new OpenAQ();

})
